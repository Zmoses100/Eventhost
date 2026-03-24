import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Video, Mic, VideoOff, MicOff, UserPlus, X } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { backendClient } from '@/lib/backendClient';
import 'webrtc-adapter';

const ParticipantVideo = ({ participant, isLocal = false }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
     if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    const setupStream = async () => {
      if (isLocal) {
        try {
          const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          streamRef.current = s;
          if (videoRef.current) videoRef.current.srcObject = s;
        } catch {
          toast({ title: "Camera access denied", variant: "destructive" });
        }
      } else {
        // Placeholder for remote streams
      }
    };

    setupStream();
  
    return () => {
      cleanupStream();
    };
  }, [isLocal, cleanupStream]);

  const toggleCamera = () => {
    if (streamRef.current) streamRef.current.getVideoTracks().forEach(t => t.enabled = !isCameraOn);
    setIsCameraOn(!isCameraOn);
  };
  
  const toggleMic = () => {
    if (streamRef.current) streamRef.current.getAudioTracks().forEach(t => t.enabled = !isMicOn);
    setIsMicOn(!isMicOn);
  };

  return (
    <div className="relative aspect-video bg-black/50 rounded-lg overflow-hidden glass-effect border-white/10">
      <video ref={videoRef} autoPlay muted={isLocal} playsInline className="w-full h-full object-cover" />
      {!isCameraOn && <div className="absolute inset-0 flex items-center justify-center bg-black/70"><VideoOff className="h-8 w-8 text-white" /></div>}
      <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center bg-black/30 p-1 rounded-md">
        <p className="text-white text-xs font-semibold truncate px-1">{participant.name}</p>
        {isLocal && (
          <div className="flex gap-1">
            <button onClick={toggleCamera} className="p-1 rounded-full bg-white/20 hover:bg-white/40">{isCameraOn ? <Video className="h-3 w-3 text-white" /> : <VideoOff className="h-3 w-3 text-red-400" />}</button>
            <button onClick={toggleMic} className="p-1 rounded-full bg-white/20 hover:bg-white/40">{isMicOn ? <Mic className="h-3 w-3 text-white" /> : <MicOff className="h-3 w-3 text-red-400" />}</button>
          </div>
        )}
      </div>
    </div>
  );
};

const CoWatchRoom = ({ open, onOpenChange, mainStream }) => {
  const { user, profile } = useAuth();
  const [participants, setParticipants] = useState([]);
  const mainVideoRef = useRef(null);
  const [inviteEmail, setInviteEmail] = useState('');

  const cleanup = useCallback(() => {
    setParticipants([]);
    if (mainVideoRef.current) mainVideoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    if (open && user && profile) {
      setParticipants([{ id: user.id, name: profile.name, isLocal: true }]);
    }
    if (!open) {
      cleanup();
    }
  }, [open, user, profile, cleanup]);

  useEffect(() => {
    if (mainVideoRef.current && mainStream) {
      mainVideoRef.current.srcObject = mainStream;
    }
     return () => {
      if (mainVideoRef.current) {
        mainVideoRef.current.srcObject = null;
      }
    };
  }, [mainStream, open]);
  
  const handleInvite = async () => {
    const { data: invitedUser, error } = await backendClient
        .from('profiles')
        .select('id, name, email')
        .eq('email', inviteEmail)
        .single();

    if (error || !invitedUser) {
        toast({ title: "User not found", variant: "destructive" });
        return;
    }

    if (invitedUser && !participants.some(p => p.id === invitedUser.id)) {
      setParticipants(prev => [...prev, { id: invitedUser.id, name: invitedUser.name, isLocal: false }]);
      toast({ title: "User Invited", description: `${invitedUser.name} has been added to the co-watch room.` });
      setInviteEmail('');
    } else {
      toast({ title: "Already in room", variant: "destructive" });
    }
  };

  const removeParticipant = (id) => {
    setParticipants(prev => prev.filter(p => p.id !== id));
  };
  
  const handleOpenChange = (isOpen) => {
    if (!isOpen) {
        cleanup();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-4">
        <DialogHeader>
          <DialogTitle className="text-white">Co-Watch Room</DialogTitle>
          <DialogDescription>Watch the event with your friends.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-4 gap-4 flex-1 overflow-hidden">
          <div className="col-span-3 bg-black rounded-lg">
            <video ref={mainVideoRef} autoPlay muted playsInline className="w-full h-full object-contain" />
          </div>
          <div className="col-span-1 flex flex-col gap-4 overflow-y-auto">
            <AnimatePresence>
              {participants.map(p => (
                <motion.div key={p.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                   <div className="relative">
                    <ParticipantVideo participant={p} isLocal={p.isLocal} />
                    {!p.isLocal && (
                        <button onClick={() => removeParticipant(p.id)} className="absolute top-1 right-1 p-1 rounded-full bg-red-500/80 hover:bg-red-500">
                            <X className="h-3 w-3 text-white" />
                        </button>
                    )}
                   </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div className="mt-auto sticky bottom-0 bg-background p-2 rounded-lg">
                <Label htmlFor="invite-email" className="text-white/80 text-sm">Invite Friends</Label>
                <div className="flex gap-2 mt-1">
                    <Input id="invite-email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="friend@example.com" className="bg-white/10 border-white/20 text-white" />
                    <Button onClick={handleInvite} size="icon"><UserPlus className="h-4 w-4" /></Button>
                </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="destructive">Leave Room</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CoWatchRoom;