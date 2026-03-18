import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export const useRealtime = (eventId, user) => {
    const [isLive, setIsLive] = useState(false);
    const [currentScene, setCurrentScene] = useState('welcome');
    const [lowerThird, setLowerThird] = useState({});

    const [messages, setMessages] = useState([]);
    const [qas, setQas] = useState([]);
    const [polls, setPolls] = useState([]);
    const [quizzes, setQuizzes] = useState([]);
    const [links, setLinks] = useState([]);
    const [ctas, setCtas] = useState([]);
    const [raisedHands, setRaisedHands] = useState([]);

    const realtimeChannel = useRef(null);

    const setupRealtimeSubscriptions = useCallback(() => {
        if (realtimeChannel.current) return;

        realtimeChannel.current = supabase.channel(`virtual-event:${eventId}`);

        const setupTableSubscription = (table, stateSetter, orderBy = 'created_at') => {
            const fetchAndSet = async () => {
                const { data, error } = await supabase.from(table).select('*').eq('event_id', eventId).order(orderBy, { ascending: true });
                if (!error) stateSetter(data || []);
            };
            fetchAndSet();
            realtimeChannel.current.on('postgres_changes', { event: '*', schema: 'public', table: table, filter: `event_id=eq.${eventId}`}, fetchAndSet);
        };
        
        setupTableSubscription('messages', setMessages);
        setupTableSubscription('qas', setQas, 'votes');
        setupTableSubscription('polls', setPolls);
        setupTableSubscription('quizzes', setQuizzes);
        setupTableSubscription('shared_links', setLinks);
        setupTableSubscription('ctas', setCtas);
        setupTableSubscription('raised_hands', setRaisedHands);

        realtimeChannel.current.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                if(user) await realtimeChannel.current.track({ user_id: user.id });
            }
        });

    }, [eventId, user]);
    
    useEffect(() => {
        if (!eventId || !user) return;
        
        const init = async () => {
            const { data: initialState, error: initialStateError } = await supabase.from('virtual_event_state').select('*').eq('event_id', eventId).single();
            if (initialState) {
                 setIsLive(initialState.is_live);
                 setCurrentScene(initialState.current_scene);
                 setLowerThird(initialState.lower_third);
            } else if (initialStateError && initialStateError.code === 'PGRST116') {
                 const defaultState = { event_id: eventId, is_live: false, current_scene: 'welcome', lower_third: {} };
                 await supabase.from('virtual_event_state').insert(defaultState);
                 setIsLive(defaultState.is_live);
                 setCurrentScene(defaultState.current_scene);
                 setLowerThird(defaultState.lower_third);
            }
        };
        init();
        setupRealtimeSubscriptions();

        return () => {
            if (realtimeChannel.current) {
                supabase.removeChannel(realtimeChannel.current);
                realtimeChannel.current = null;
            }
        };
    }, [eventId, user, setupRealtimeSubscriptions]);

    const updateEventState = async (newState) => {
        const { error } = await supabase.from('virtual_event_state').upsert({ event_id: eventId, ...newState }, { onConflict: 'event_id' });
        if(error) {
            console.error("Update failed:", error);
        }
        return { error };
    };
    
    return {
        isLive, setIsLive,
        currentScene, setCurrentScene,
        lowerThird, setLowerThird,
        messages, setMessages,
        qas, setQas,
        polls, setPolls,
        quizzes, setQuizzes,
        links, setLinks,
        ctas, setCtas,
        raisedHands, setRaisedHands,
        realtimeChannel,
        updateEventState
    };
};