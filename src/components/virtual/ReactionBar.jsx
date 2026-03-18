import React from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const reactions = [
  { type: 'like', emoji: '👍' },
  { type: 'love', emoji: '❤️' },
  { type: 'celebrate', emoji: '🎉' },
  { type: 'laugh', emoji: '😂' },
  { type: 'wow', emoji: '😮' },
];

const ReactionBar = ({ onReact }) => {
  return (
    <div className="flex items-center gap-1 p-1 rounded-full bg-black/20 backdrop-blur-sm">
      {reactions.map((reaction) => (
        <motion.div whileHover={{ scale: 1.3 }} whileTap={{ scale: 0.8 }} key={reaction.type}>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onReact(reaction.type)}
            className="rounded-full text-xl hover:bg-white/20"
          >
            {reaction.emoji}
          </Button>
        </motion.div>
      ))}
    </div>
  );
};

export default ReactionBar;