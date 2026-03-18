import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { backendClient } from '@/lib/backendClient';
import { X, Send } from 'lucide-react';

const InviteSpeakerDialog = ({ onInviteSpeaker, onOpenChange }) => {
    const [email, setEmail] = useState('');
  
    const handleInvite = async () => {
      if (!email) {
        toast({ title: "Email required", description: "Please enter the speaker's email.", variant: "destructive" });
        return;
      }
      const { data: userToInvite, error } = await backendClient
        .from('profiles')
        .select('id, name')
        .eq('email', email)
        .eq('role', 'Speaker')
        .single();
        
      if (error || !userToInvite) {
        toast({ title: "Speaker not found", description: "No user with the Speaker role found for this email address.", variant: "destructive" });
        return;
      }
      onInviteSpeaker(userToInvite);
      setEmail('');
      toast({ title: "Speaker Invited", description: `${userToInvite.name} has been added as a speaker.` });
      onOpenChange(false);
    };
  
    return (
      <DialogContent className="glass-effect">
        <DialogHeader>
          <DialogTitle className="text-white">Invite Speaker</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Label htmlFor="speaker-email" className="text-white/80">Speaker's Email</Label>
          <Input id="speaker-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="speaker@example.com" className="bg-white/10 border-white/20 text-white" />
        </div>
        <DialogFooter>
            <Button onClick={handleInvite} className="bg-white text-purple-600 hover:bg-white/90">
              <Send className="h-4 w-4 mr-2" />
              Send Invitation
            </Button>
        </DialogFooter>
      </DialogContent>
    );
};
  
const ManageSpeakersDialog = ({ open, onOpenChange, event, onInviteSpeaker, onRemoveSpeaker }) => {
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="glass-effect">
          <DialogHeader>
            <DialogTitle className="text-white">Manage Speakers</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {event?.speakers && event.speakers.length > 0 ? (
              event.speakers.map((speaker) => (
                <div key={speaker.user_id} className="flex justify-between items-center p-2 bg-white/5 rounded">
                  <div>
                    <p className="font-semibold text-white">{speaker.profiles?.name || 'Unnamed Speaker'}</p>
                    <p className="text-sm text-white/70">{speaker.profiles?.email || 'No Email'}</p>
                  </div>
                  <Button onClick={() => onRemoveSpeaker(speaker.user_id)} variant="ghost" size="icon" className="text-red-400 hover:text-red-500">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-white/70 text-center py-4">No speakers assigned to this event.</p>
            )}
          </div>
          <DialogFooter>
            <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                <DialogTrigger asChild>
                    <Button className="bg-white text-purple-600 hover:bg-white/90">Invite Speaker</Button>
                </DialogTrigger>
                <InviteSpeakerDialog onInviteSpeaker={onInviteSpeaker} onOpenChange={setIsInviteOpen} />
            </Dialog>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
};

export default ManageSpeakersDialog;