import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Inbox, ArrowLeft, Loader2, Send, MessageSquarePlus, UserCircle, Users } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty, CommandGroup } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const NewMessageDialog = ({ onMessageSent }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [content, setContent] = useState('');
  const [recipient, setRecipient] = useState(null);
  const [users, setUsers] = useState([]);
  const [popoverOpen, setPopoverOpen] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase.from('profiles').select('id, name, email, profile_picture_url');
      if (!error) {
        setUsers(data.filter(u => u.id !== user.id));
      }
    };
    if (open || popoverOpen) {
      fetchUsers();
    }
  }, [open, popoverOpen, user]);

  const handleSendMessage = async () => {
    if (!content.trim() || !recipient) {
      toast({ title: "Error", description: "Please select a recipient and write a message.", variant: "destructive" });
      return;
    }
    setSending(true);
    const { error } = await supabase.from('direct_messages').insert({
      sender_id: user.id,
      receiver_id: recipient.id,
      content: content.trim(),
    });

    if (error) {
      toast({ title: "Failed to send message", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Message Sent!", description: `Your message to ${recipient.name} has been sent.` });
      setContent('');
      setRecipient(null);
      onMessageSent();
      setOpen(false);
    }
    setSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-white text-purple-600 hover:bg-white/90">
          <MessageSquarePlus className="mr-2 h-4 w-4" />
          New Message
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Compose a New Message</DialogTitle>
          <DialogDescription>Select a recipient and write your message below.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                {recipient ? (
                  <>
                    <Avatar className="h-6 w-6 mr-2">
                        <AvatarImage src={recipient.profile_picture_url} alt={recipient.name} />
                        <AvatarFallback><UserCircle className="h-6 w-6" /></AvatarFallback>
                    </Avatar>
                    {recipient.name}
                  </>
                ) : (
                  <>
                    <Users className="mr-2 h-4 w-4" />
                    Select Recipient
                  </>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
              <Command>
                <CommandInput placeholder="Search users..." />
                <CommandList>
                  <CommandEmpty>No users found.</CommandEmpty>
                  <CommandGroup>
                    {users.map((u) => (
                      <CommandItem key={u.id} value={u.name} onSelect={() => { setRecipient(u); setPopoverOpen(false); }}>
                        <Avatar className="h-6 w-6 mr-2">
                            <AvatarImage src={u.profile_picture_url} alt={u.name} />
                            <AvatarFallback>{u.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <span>{u.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Textarea
            placeholder="Type your message here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={handleSendMessage} disabled={sending || !content.trim() || !recipient}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send Message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const MessagesPage = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageLoading, setMessageLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.rpc('get_conversations');
    if (error) {
      toast({ title: "Error fetching conversations", description: error.message, variant: "destructive" });
    } else {
      setConversations(data.map(c => ({...c, partner: { id: c.partner_id, name: c.partner_name, profile_picture_url: c.partner_profile_picture_url }})));
    }
    setLoading(false);
  }, [user]);

  const fetchMessages = useCallback(async (partnerId) => {
    if(!partnerId || !user) return;
    setMessageLoading(true);
    const { data, error } = await supabase
      .from('direct_messages')
      .select('*, sender:sender_id(id, name, profile_picture_url)')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    if (error) {
      toast({ title: "Error fetching messages", description: error.message, variant: "destructive" });
    } else {
      setMessages(data);
      // Mark as read
      await supabase
        .from('direct_messages')
        .update({ is_read: true })
        .eq('receiver_id', user.id)
        .eq('sender_id', partnerId);
    }
    setMessageLoading(false);
  }, [user]);

  useEffect(() => {
    fetchConversations();
    
    const channel = supabase.channel('direct-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' }, payload => {
        fetchConversations();
        if(selectedConversation && (payload.new.sender_id === selectedConversation.partner.id || payload.new.receiver_id === selectedConversation.partner.id)){
          fetchMessages(selectedConversation.partner.id);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

  }, [user, fetchConversations, selectedConversation, fetchMessages]);
  
  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.partner.id);
  };

  const handleSendReply = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    setSendingReply(true);
    const { error } = await supabase.from('direct_messages').insert({
      sender_id: user.id,
      receiver_id: selectedConversation.partner.id,
      content: newMessage.trim(),
    });

    if (error) {
      toast({ title: "Failed to send reply", description: error.message, variant: "destructive" });
    } else {
      setNewMessage('');
    }
    setSendingReply(false);
  };

  const conversationList = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-white/20 flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Conversations</h2>
        <NewMessageDialog onMessageSent={fetchConversations} />
      </div>
      {loading ? (
        <div className="flex-grow flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>
      ) : conversations.length > 0 ? (
        <div className="flex-grow overflow-y-auto">
          {conversations.map(convo => (
            <div
              key={convo.partner_id}
              className={`p-4 flex items-center cursor-pointer transition-colors border-l-4 ${selectedConversation?.partner.id === convo.partner_id ? 'bg-purple-500/20 border-purple-400' : 'border-transparent hover:bg-white/5'}`}
              onClick={() => handleSelectConversation(convo)}
            >
              <Avatar className="h-12 w-12 mr-4">
                  <AvatarImage src={convo.partner_profile_picture_url} alt={convo.partner_name} />
                  <AvatarFallback>{convo.partner_name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-grow overflow-hidden">
                <div className="flex justify-between items-center">
                  <p className="font-bold text-white truncate">{convo.partner_name}</p>
                  {convo.unread_count > 0 && <Badge>{convo.unread_count}</Badge>}
                </div>
                <p className="text-sm text-white/70 truncate">{convo.last_message}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-grow flex flex-col justify-center items-center text-center p-4">
          <MessageSquarePlus className="h-12 w-12 text-white/30 mb-4" />
          <h3 className="text-lg font-semibold text-white">No conversations yet</h3>
          <p className="text-white/60 text-sm">Start a new message to begin.</p>
        </div>
      )}
    </div>
  );

  const messageView = (
    <div className="flex flex-col h-full bg-white/5">
      {selectedConversation ? (
        <>
          <div className="p-4 border-b border-white/20 flex items-center">
            <Avatar className="h-10 w-10 mr-3">
              <AvatarImage src={selectedConversation.partner.profile_picture_url} alt={selectedConversation.partner.name} />
              <AvatarFallback>{selectedConversation.partner.name?.[0]}</AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-bold text-white">{selectedConversation.partner.name}</h2>
          </div>
          <div className="flex-grow overflow-y-auto p-4 space-y-4">
            {messageLoading ? <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-white"/></div> :
              messages.map(msg => (
                <div key={msg.id} className={`flex items-end gap-2 ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                  {msg.sender_id !== user.id && (
                     <Avatar className="h-8 w-8">
                      <AvatarImage src={msg.sender?.profile_picture_url} />
                      <AvatarFallback>{msg.sender?.name?.[0]}</AvatarFallback>
                     </Avatar>
                  )}
                  <div className={`max-w-xs md:max-w-md p-3 rounded-xl ${msg.sender_id === user.id ? 'bg-purple-600 text-white rounded-br-none' : 'bg-gray-700 text-white rounded-bl-none'}`}>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              ))
            }
          </div>
          <div className="p-4 border-t border-white/20">
            <div className="relative">
              <Textarea placeholder="Type a message..." value={newMessage} onChange={e => setNewMessage(e.target.value)} className="pr-16 bg-white/10 border-white/20 text-white" onKeyDown={e => {if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); }}}/>
              <Button size="icon" className="absolute right-2 top-1/2 -translate-y-1/2" onClick={handleSendReply} disabled={sendingReply || !newMessage.trim()}>
                {sendingReply ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="h-full flex flex-col justify-center items-center text-white/60 text-center p-8">
          <Inbox className="h-24 w-24 text-white/20 mb-4" />
          <h2 className="text-2xl font-bold text-white">Select a conversation</h2>
          <p className="mt-2">Choose from your existing conversations or start a new one.</p>
        </div>
      )}
    </div>
  );

  return (
    <>
      <Helmet>
        <title>My Messages - EventHost</title>
        <meta name="description" content="View and send direct messages." />
      </Helmet>
      <div className="pt-24 pb-12 px-4 min-h-screen">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-6xl mx-auto">
          <Link to="/dashboard" className="inline-flex items-center text-white/80 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          <Card className="glass-effect border-white/20 h-[70vh] overflow-hidden">
            <CardContent className="p-0 h-full">
              <div className="grid grid-cols-1 md:grid-cols-3 h-full">
                <div className="col-span-1 border-r border-white/20 h-full overflow-y-auto">
                  {conversationList}
                </div>
                <div className="hidden md:block md:col-span-2 h-full">
                  {messageView}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
};

export default MessagesPage;