import { useState, useEffect, useCallback, useRef } from 'react';
import { backendClient } from '@/lib/backendClient';

export const useEventChat = (eventId, userProfile) => {
  const [messages, setMessages] = useState([]);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!eventId || !userProfile) return;

    const channel = backendClient.channel(`event-chat-${eventId}`, {
      config: {
        broadcast: {
          self: true,
        },
      },
    });

    channel
      .on('broadcast', { event: 'chat' }, (payload) => {
        setMessages((prevMessages) => [...prevMessages, payload.payload]);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // You could fetch historical messages here if you were storing them
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        backendClient.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [eventId, userProfile]);

  const sendMessage = useCallback(
    (text) => {
      if (!text.trim() || !channelRef.current || !userProfile) return;

      const message = {
        id: new Date().toISOString(), // simple unique id
        user_id: userProfile.id,
        user_name: userProfile.name || 'Anonymous',
        role: userProfile.role,
        text,
      };

      channelRef.current.send({
        type: 'broadcast',
        event: 'chat',
        payload: message,
      });
    },
    [userProfile]
  );

  return { messages, sendMessage };
};