import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MessageSquare, Send, CreditCard, Users, Crown, Mic } from 'lucide-react';

const ChatPanel = ({ messages, onSendMessage, onStartCoWatch, onUnsupportedFeature, onSendTip }) => {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'Event Organizer':
        return 'text-yellow-400';
      case 'Super Admin':
        return 'text-red-400';
      case 'Speaker':
        return 'text-blue-400';
      default:
        return 'text-purple-300';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'Event Organizer':
      case 'Super Admin':
        return <Crown className="h-3 w-3 inline-block mr-1" />;
      case 'Speaker':
        return <Mic className="h-3 w-3 inline-block mr-1" />;
      default:
        return null;
    }
  };

  return (
    <Card className="glass-effect border-white/20 h-full flex flex-col max-h-[calc(100vh-8rem)]">
      <CardHeader><CardTitle className="text-xl text-white flex items-center"><MessageSquare className="h-5 w-5 mr-2" />Live Chat</CardTitle></CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((msg) => (
          <div key={msg.id} className="text-sm">
            <span className={`font-bold ${getRoleColor(msg.role)}`}>
              {getRoleIcon(msg.role)}
              {msg.user_name}:
            </span>
            <span className="text-white/90 ml-2">{msg.text}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </CardContent>
      <div className="p-4 border-t border-white/20">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Say something..." className="bg-white/10 border-white/20 text-white" />
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" size="icon" className="bg-white/10 hover:bg-white/20 text-white flex-shrink-0"><CreditCard className="h-4 w-4" /></Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="grid gap-4">
                <div className="space-y-2"><h4 className="font-medium leading-none text-white">In-Chat Payment</h4><p className="text-sm text-white/70">Send a tip to the organizer.</p></div>
                <Button onClick={onSendTip || onUnsupportedFeature} className="bg-white text-purple-600 hover:bg-white/90">Send Tip</Button>
              </div>
            </PopoverContent>
          </Popover>
          <Button type="submit" size="icon" className="bg-white/10 hover:bg-white/20 text-white flex-shrink-0"><Send className="h-4 w-4" /></Button>
        </form>
      </div>
      <CardContent className="border-t border-white/20 pt-4">
        <Button onClick={onStartCoWatch} className="w-full bg-purple-600/80 hover:bg-purple-700/80 text-white">
          <Users className="h-4 w-4 mr-2"/>Start Co-Watch Room
        </Button>
      </CardContent>
    </Card>
  );
};

export default ChatPanel;