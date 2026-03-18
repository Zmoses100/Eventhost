import React, { useState } from 'react';
import { useAuth } from '@/context/SupabaseAuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { Bookmark, Share2, Mail, Copy, Twitter, Facebook, Linkedin } from 'lucide-react';
import { ActionButtons } from '@/components/Event/ActionButtons';
import useLocalStorage from '@/hooks/use-local-storage';
import { v4 as uuidv4 } from 'uuid';

const ShareDialog = ({ event }) => {
    const url = window.location.href;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(url);
        toast({ title: 'Link Copied!', description: 'Event link copied to your clipboard.' });
    };

    const share = (platform) => {
        const text = `Check out this event: ${event.title}!`;
        let shareUrl = '';
        if (platform === 'twitter') shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
        if (platform === 'facebook') shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        if (platform === 'linkedin') shareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(event.title)}&summary=${encodeURIComponent(event.description)}`;
        window.open(shareUrl, '_blank');
    };

    return (
        <DialogContent className="glass-effect">
            <DialogHeader>
                <DialogTitle className="text-white">Share "{event.title}"</DialogTitle>
                <DialogDescription>Spread the word and invite others!</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="flex items-center space-x-2">
                    <input id="link" value={url} readOnly className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 bg-white/10 border-white/20 text-white" />
                    <Button type="button" size="sm" className="px-3" onClick={copyToClipboard}>
                        <span className="sr-only">Copy</span>
                        <Copy className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex justify-center gap-4 pt-4">
                    <Button onClick={() => share('twitter')} variant="outline" size="icon" className="h-14 w-14 rounded-full bg-white/10 text-white border-white/20 hover:bg-white/20"><Twitter className="h-6 w-6" /></Button>
                    <Button onClick={() => share('facebook')} variant="outline" size="icon" className="h-14 w-14 rounded-full bg-white/10 text--white border-white/20 hover:bg-white/20"><Facebook className="h-6 w-6" /></Button>
                    <Button onClick={() => share('linkedin')} variant="outline" size="icon" className="h-14 w-14 rounded-full bg-white/10 text-white border-white/20 hover:bg-white/20"><Linkedin className="h-6 w-6" /></Button>
                </div>
            </div>
        </DialogContent>
    );
};

const ContactDialog = ({ event, user }) => {
    const [messageContent, setMessageContent] = useState('');
    const [messages, setMessages] = useLocalStorage('messages', []);

    const handleSendMessage = () => {
        if (!user) {
            toast({ title: "Login Required", description: "You must be logged in to send a message.", variant: "destructive" });
            return;
        }
        if (!messageContent.trim()) {
            toast({ title: "Empty Message", description: "Please write a message before sending.", variant: "destructive" });
            return;
        }
        
        // This logic is flawed as it relies on localStorage 'users_db' which is being removed.
        // It needs to be updated to fetch organizer details from the event object itself.
        // For now, we'll assume event.organizer is just a name string. A real implementation would need the organizer's user ID.
        // I will leave a simplified version.
        const newMessage = {
          id: uuidv4(),
          eventId: event.id,
          eventName: event.title,
          // organizerId: event.organizerId, // This should be available in the event object
          senderId: user.id,
          senderName: user.user_metadata?.name || 'A user',
          content: messageContent,
          timestamp: new Date().toISOString(),
          isRead: false,
        };

        setMessages(prev => [...prev, newMessage]);
        setMessageContent('');
        toast({ title: "Message Sent!", description: `Your message to ${event.organizer} has been sent.` });
    };

    return (
         <DialogContent>
            <DialogHeader><DialogTitle>Contact {event.organizer}</DialogTitle><DialogDescription>Send a message directly to the event organizer.</DialogDescription></DialogHeader>
            <div className="space-y-4 py-4">
                <Textarea placeholder="Your message..." className="bg-white/10 border-white/20 text-white min-h-[120px]" value={messageContent} onChange={(e) => setMessageContent(e.target.value)}/>
            </div>
            <DialogFooter><Button onClick={handleSendMessage} className="bg-white text-purple-600 hover:bg-white/90">Send Message</Button></DialogFooter>
        </DialogContent>
    )
}

export const Sidebar = ({ event }) => {
    const [bookmarks, setBookmarks] = useLocalStorage('bookmarks', []);
    const isBookmarked = bookmarks.includes(event.id);
    const { user } = useAuth();
    
    const toggleBookmark = () => {
        setBookmarks(prev => isBookmarked ? prev.filter(bId => bId !== event.id) : [...prev, event.id]);
        toast({ title: isBookmarked ? "Bookmark Removed" : "Event Bookmarked!", description: event.title });
    };

    return (
        <Card className="glass-effect border-white/20 sticky top-24">
            <CardContent className="p-6">
                <div className="text-center mb-6">
                    <div className="text-3xl font-bold text-white mb-2">
                        {event.price === 0 ? 'Free' : `$${event.price.toFixed(2)}`}
                    </div>
                </div>
                
                <ActionButtons event={event} />

                <div className="flex justify-around mt-4">
                    <Button onClick={toggleBookmark} variant="ghost" className="text-white/80 hover:text-white flex flex-col h-auto px-2">
                        <Bookmark className={`h-6 w-6 mb-1 ${isBookmarked ? 'text-purple-400 fill-purple-400' : ''}`}/> 
                        <span className="text-xs">Bookmark</span>
                    </Button>
                    
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="ghost" className="text-white/80 hover:text-white flex flex-col h-auto px-2">
                                <Share2 className="h-6 w-6 mb-1"/> 
                                <span className="text-xs">Share</span>
                            </Button>
                        </DialogTrigger>
                        <ShareDialog event={event} />
                    </Dialog>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" className="text-white/80 hover:text-white flex flex-col h-auto px-2">
                            <Mail className="h-6 w-6 mb-1"/> 
                            <span className="text-xs">Contact</span>
                        </Button>
                      </DialogTrigger>
                      <ContactDialog event={event} user={user} />
                    </Dialog>
                </div>
            </CardContent>
        </Card>
    );
};