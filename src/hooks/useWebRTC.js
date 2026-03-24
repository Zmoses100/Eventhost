import { useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

export const useWebRTC = (realtimeChannel, localStreamRef, mainVideoRef, user, canControlEvent) => {
    const peerConnections = useRef({});

    const handleOffer = useCallback(async ({ offer, fromId }) => {
        const pc = peerConnections.current[fromId] || createPeerConnection(fromId);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        realtimeChannel.current.send({
            type: 'broadcast',
            event: 'webrtc-answer',
            payload: { answer, fromId: user.id, targetId: fromId }
        });
    }, [realtimeChannel, user]);

    const handleAnswer = useCallback(async ({ answer, fromId }) => {
        const pc = peerConnections.current[fromId];
        if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
    }, []);

    const handleNewIceCandidate = useCallback(({ candidate, fromId, targetId }) => {
        let pc;
        if (canControlEvent && fromId && fromId !== user.id) {
           pc = peerConnections.current[fromId];
        } else if (!canControlEvent && targetId === user.id) {
            pc = Object.values(peerConnections.current)[0];
        }

        if (pc) {
            pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
    }, [canControlEvent, user]);

    const createPeerConnection = useCallback((targetId) => {
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                realtimeChannel.current.send({
                    type: 'broadcast',
                    event: 'webrtc-candidate',
                    payload: { candidate: event.candidate, targetId: targetId }
                });
            }
        };

        if (canControlEvent) {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => {
                    pc.addTrack(track, localStreamRef.current);
                });
            }
        } else {
            pc.ontrack = (event) => {
                if (mainVideoRef.current) {
                    mainVideoRef.current.srcObject = event.streams[0];
                }
            };
        }
        
        peerConnections.current[targetId] = pc;
        return pc;
    }, [canControlEvent, localStreamRef, mainVideoRef, realtimeChannel]);

    const sendOffer = useCallback(async (targetId) => {
        const pc = peerConnections.current[targetId] || createPeerConnection(targetId);
        
        const localStream = localStreamRef.current;
        if (localStream) {
             const senders = pc.getSenders();
             localStream.getTracks().forEach(track => {
                 if (!senders.find(s => s.track === track)) {
                     pc.addTrack(track, localStream);
                 }
             });
        }

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        realtimeChannel.current.send({
            type: 'broadcast',
            event: 'webrtc-offer',
            payload: { offer, fromId: user.id, targetId }
        });
    }, [createPeerConnection, user, realtimeChannel]);

    const closeAllPeerConnections = useCallback(() => {
        Object.values(peerConnections.current).forEach(pc => pc.close());
        peerConnections.current = {};
    }, []);

    // Setup listeners on the channel
    if (realtimeChannel?.current) {
        realtimeChannel.current.on('presence', { event: 'join' }, ({ newPresences }) => {
            if (canControlEvent) {
                newPresences.forEach(p => {
                    if (p.user_id !== user.id) {
                        sendOffer(p.user_id);
                    }
                });
            }
        });
        realtimeChannel.current.on('broadcast', { event: 'webrtc-offer' }, ({ payload }) => {
            if (!canControlEvent && payload.targetId === user.id) {
                handleOffer(payload);
            }
        });
        realtimeChannel.current.on('broadcast', { event: 'webrtc-answer' }, ({ payload }) => {
            if (canControlEvent) {
                handleAnswer(payload);
            }
        });
        realtimeChannel.current.on('broadcast', { event: 'webrtc-candidate' }, ({ payload }) => {
            handleNewIceCandidate(payload);
        });
    }

    return {
        peerConnections,
        handleNewIceCandidate,
        sendOffer,
        closeAllPeerConnections,
    };
}