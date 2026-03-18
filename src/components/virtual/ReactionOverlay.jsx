import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';

const ReactionOverlay = ({ eventId }) => {
  const [reactions, setReactions] = useState([]);

  const handleNewReaction = useCallback((payload) => {
    const newReaction = {
      ...payload.new,
      id: Math.random(), 
      x: Math.random() * 80 + 10, 
      duration: Math.random() * 2 + 3,
    };
    setReactions(currentReactions => [...currentReactions, newReaction]);
    
    setTimeout(() => {
        setReactions(currentReactions => currentReactions.filter(r => r.id !== newReaction.id));
    }, newReaction.duration * 1000);
  }, []);

  useEffect(() => {
    const channel = supabase.channel(`reactions:${eventId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reactions', filter: `event_id=eq.${eventId}` }, handleNewReaction)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, handleNewReaction]);

  const getEmoji = (type) => {
    const emojiMap = {
      'like': '👍',
      'love': '❤️',
      'laugh': '😂',
      'celebrate': '🎉',
      'wow': '😮',
    };
    return emojiMap[type] || '👍';
  };

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
      <AnimatePresence>
        {reactions.map(reaction => (
          <motion.div
            key={reaction.id}
            initial={{ y: '100%', x: `${reaction.x}%`, opacity: 1, scale: 0.5 }}
            animate={{ y: '-100%', opacity: 0, scale: 1 }}
            transition={{ duration: reaction.duration, ease: "linear" }}
            className="absolute bottom-0 text-3xl"
          >
            {getEmoji(reaction.reaction_type)}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ReactionOverlay;