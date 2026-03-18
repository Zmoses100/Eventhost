import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Hand, Mic, X } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const RaisedHandsPanel = ({ raisedHands, onLowerHand }) => {
  
  const onInviteToSpeak = (userId) => {
    toast({
      title: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
      description: `You can invite user ${userId} to speak.`,
    });
  };

  return (
    <Card className="glass-effect border-white/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Hand className="h-5 w-5 mr-2 text-yellow-400" /> Raised Hands ({raisedHands.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-80 overflow-y-auto">
        {raisedHands.length > 0 ? (
          raisedHands.map(hand => (
            <div key={hand.user_id} className="flex items-center justify-between p-2 bg-white/10 rounded-lg">
              <p className="text-sm text-white/90">{hand.user_name}</p>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" className="text-green-400 hover:bg-green-400/20 hover:text-green-300" onClick={() => onInviteToSpeak(hand.user_id)}>
                    <Mic className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="text-red-400 hover:bg-red-400/20 hover:text-red-300" onClick={() => onLowerHand(hand.user_id)}>
                    <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-white/60 text-center py-4">No hands raised right now.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default RaisedHandsPanel;