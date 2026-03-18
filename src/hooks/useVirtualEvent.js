import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { useRealtime } from '@/hooks/useRealtime';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useEventActions } from '@/hooks/useEventActions';

export const useVirtualEvent = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const { user, profile: userProfile } = useAuth();

    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [canControlEvent, setCanControlEvent] = useState(false);

    const [stream, setStream] = useState(null);
    const [screenStream, setScreenStream] = useState(null);
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [isMicOn, setIsMicOn] = useState(false);
    const [isSharingScreen, setIsSharingScreen] = useState(false);
    const [showInterpreter, setShowInterpreter] = useState(false);
    const [isCoWatchOpen, setCoWatchOpen] = useState(false);
    
    const videoRef = useRef(null);
    const mainVideoRef = useRef(null);
    const interpreterVideoRef = useRef(null);
    const localStreamRef = useRef(null);
    
    const {
        isLive, setIsLive,
        currentScene, setCurrentScene,
        lowerThird, setLowerThird,
        messages,
        qas,
        polls,
        quizzes,
        links,
        ctas,
        raisedHands,
        realtimeChannel,
        updateEventState
    } = useRealtime(eventId, user);

    const onStateChange = useCallback((newState) => {
        if (newState) {
            setIsLive(newState.is_live);
            setCurrentScene(newState.current_scene);
            setLowerThird(newState.lower_third);
        }
    }, [setIsLive, setCurrentScene, setLowerThird]);

    useEffect(() => {
        if (realtimeChannel.current) {
            const subscription = realtimeChannel.current.on('postgres_changes', { event: '*', schema: 'public', table: 'virtual_event_state', filter: `event_id=eq.${eventId}` },
                (payload) => {
                    onStateChange(payload.new);
                }
            );
            return () => {
                if(subscription) {
                    subscription.unsubscribe();
                }
            }
        }
    }, [realtimeChannel, onStateChange, eventId]);

    const { peerConnections, sendOffer, closeAllPeerConnections } = useWebRTC(
        realtimeChannel, 
        localStreamRef, 
        mainVideoRef, 
        user, 
        canControlEvent
    );

    const fetchEvent = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('events')
            .select(`
                *,
                profiles ( name ),
                speakers!speakers_event_id_fkey ( user_id, profiles ( id, name, profile_picture_url, email ) )
            `)
            .eq('id', eventId)
            .single();

        if (error || !data) {
            toast({ title: 'Error fetching event', description: error?.message || 'Event not found.', variant: 'destructive' });
            navigate('/');
            return;
        }

        setEvent(data);
        const isOrganizer = data.organizer_id === user.id;
        const isSpeaker = data.speakers.some(s => s.user_id === user.id);
        const canControl = isOrganizer || isSpeaker;
        setCanControlEvent(canControl);
        
        const { data: stateData } = await supabase.from('virtual_event_state').select('*').eq('event_id', eventId).single();
        if (stateData) {
            onStateChange(stateData);
        }

        setLoading(false);
    }, [eventId, user, navigate, onStateChange]);
    
    useEffect(() => {
        if (user) fetchEvent();
    }, [user, fetchEvent]);

    useEffect(() => {
        localStreamRef.current = isSharingScreen ? screenStream : stream;
        if (canControlEvent && isLive) {
            Object.keys(peerConnections.current).forEach(userId => {
                sendOffer(userId);
            });
        }
    }, [stream, screenStream, isSharingScreen, canControlEvent, isLive, sendOffer, peerConnections]);

    const handleGoLive = async () => {
        if (!localStreamRef.current) {
            toast({ title: "No stream source", description: "Please enable your camera or start screen sharing.", variant: "destructive" });
            return;
        }

        const newState = { is_live: true, current_scene: 'main-talk' };
        const { error } = await updateEventState(newState);
        if (!error) {
            onStateChange(newState);
            const presences = realtimeChannel.current.presenceState();
            Object.keys(presences).forEach(presenceId => {
                const userId = presences[presenceId][0].user_id;
                if(userId !== user.id){
                    sendOffer(userId);
                }
            })
            toast({ title: "You are now LIVE!", description: "Your event broadcast has started." });
        }
    };
    
    const handleStopLive = async () => {
        const newState = { is_live: false, current_scene: 'ending' };
        const { error } = await updateEventState(newState);
        if (!error) {
            onStateChange(newState);
            closeAllPeerConnections();
            toast({ title: "Stream Ended", description: "Your broadcast has successfully ended." });
        }
    };

    const handleSceneChange = (scene) => {
        const newState = { current_scene: scene };
        updateEventState(newState);
        onStateChange({ is_live: isLive, lower_third: lowerThird, ...newState });
        toast({ title: `Scene changed to: ${scene.toUpperCase()}`});
    };
    
    const handleLowerThirdChange = (lt) => {
        const newState = { lower_third: lt };
        updateEventState(newState);
        onStateChange({ is_live: isLive, current_scene: currentScene, ...newState });
    };

    const handleRaiseHand = async () => {
        const { error } = await supabase.from('raised_hands').insert({
            event_id: eventId,
            user_id: user.id,
            user_name: userProfile.name || user.email
        });
        if (error) toast({ title: 'Error raising hand', description: error.message, variant: 'destructive'});
    };

    const handleLowerHand = async (userIdToClear) => {
        const idToClear = userIdToClear || user.id;

        if (!idToClear) {
            toast({ title: 'Error lowering hand', description: 'User ID not found.', variant: 'destructive'});
            return;
        }
        
        const { error } = await supabase.from('raised_hands').delete().match({ event_id: eventId, user_id: idToClear });
        if (error) toast({ title: 'Error lowering hand', description: error.message, variant: 'destructive'});
    };


    const handleSendReaction = async (reactionType) => {
        await supabase.from('reactions').insert({ event_id: eventId, reaction_type: reactionType });
    };

    const eventActions = useEventActions(eventId, user, userProfile, fetchEvent);

    return {
        eventId, user, userProfile, event, loading,
        videoRef, mainVideoRef, interpreterVideoRef,
        stream, setStream, screenStream, setScreenStream,
        isCameraOn, setIsCameraOn, isMicOn, setIsMicOn,
        isSharingScreen, setIsSharingScreen, showInterpreter, setShowInterpreter,
        isCoWatchOpen, setCoWatchOpen,
        messages,
        isLive, currentScene, lowerThird,
        qas, polls, quizzes, links, ctas, raisedHands,
        canControlEvent, handleGoLive, handleStopLive,
        handleSceneChange, handleLowerThirdChange,
        handleRaiseHand, handleLowerHand, handleSendReaction,
        ...eventActions,
    };
};