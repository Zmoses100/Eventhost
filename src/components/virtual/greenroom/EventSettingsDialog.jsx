import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const EventSettingsDialog = ({ open, onOpenChange, event, onSave }) => {
  const [tipPriceId, setTipPriceId] = useState('');
  const [recordingQuality, setRecordingQuality] = useState('1080p');
  const [audioEnhancements, setAudioEnhancements] = useState(true);
  const [transcriptionSettings, setTranscriptionSettings] = useState({
    fontSize: '16px',
    fontWeight: '500',
    color: '#FFFFFF',
    background: 'rgba(0, 0, 0, 0.7)'
  });

  useEffect(() => {
    if (event) {
      setTipPriceId(event.tip_price_id || '');
      setRecordingQuality(event.recording_quality || '1080p');
      setAudioEnhancements(event.audio_enhancements !== false);
      setTranscriptionSettings(event.transcription_settings || { fontSize: '16px', fontWeight: '500', color: '#FFFFFF', background: 'rgba(0, 0, 0, 0.7)' });
    }
  }, [event]);
  
  const handleTranscriptionSettingChange = (key, value) => {
    setTranscriptionSettings(prev => ({...prev, [key]: value}));
  }

  const handleSave = () => {
    if (tipPriceId && !tipPriceId.startsWith('price_')) {
        toast({ title: 'Invalid Stripe Price ID', description: 'It should start with "price_"', variant: 'destructive'});
        return;
    }
    onSave({ 
      tip_price_id: tipPriceId,
      recording_quality: recordingQuality,
      audio_enhancements: audioEnhancements,
      transcription_settings: transcriptionSettings,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-effect border-white/20 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle>Event Settings</DialogTitle>
          <DialogDescription>
            Manage settings for your event.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/5">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="transcription">Transcription</TabsTrigger>
          </TabsList>
          <TabsContent value="general" className="pt-4">
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tip-price-id" className="text-right">
                  Tip Price ID
                </Label>
                <Input
                  id="tip-price-id"
                  value={tipPriceId}
                  onChange={(e) => setTipPriceId(e.target.value)}
                  className="col-span-3 bg-white/10 border-white/20 text-white"
                  placeholder="price_... (optional)"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="recording-quality" className="text-right">
                  Recording
                </Label>
                <Select value={recordingQuality} onValueChange={setRecordingQuality}>
                  <SelectTrigger className="col-span-3 bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Select quality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="720p">720p (HD)</SelectItem>
                    <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                    <SelectItem value="1440p">1440p (2K)</SelectItem>
                    <SelectItem value="4k">4K</SelectItem>
                    <SelectItem value="8k">8K (Experimental)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="audio-enhancements" className="text-right">
                  Audio Boost
                </Label>
                <div className="col-span-3 flex items-center gap-2">
                    <Switch
                      id="audio-enhancements"
                      checked={audioEnhancements}
                      onCheckedChange={setAudioEnhancements}
                    />
                    <span className="text-sm text-white/70">Enable noise reduction & echo cancellation</span>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="transcription" className="pt-4">
            <div className="grid gap-6 py-4">
               <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="font-size" className="text-right">Font Size</Label>
                  <Select value={transcriptionSettings.fontSize} onValueChange={(v) => handleTranscriptionSettingChange('fontSize', v)}>
                    <SelectTrigger className="col-span-3 bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Select font size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="14px">Small (14px)</SelectItem>
                      <SelectItem value="16px">Medium (16px)</SelectItem>
                      <SelectItem value="20px">Large (20px)</SelectItem>
                      <SelectItem value="24px">Extra Large (24px)</SelectItem>
                    </SelectContent>
                  </Select>
               </div>
               <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="font-weight" className="text-right">Font Weight</Label>
                  <Select value={transcriptionSettings.fontWeight} onValueChange={(v) => handleTranscriptionSettingChange('fontWeight', v)}>
                    <SelectTrigger className="col-span-3 bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Select font weight" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="400">Normal</SelectItem>
                      <SelectItem value="500">Medium</SelectItem>
                      <SelectItem value="700">Bold</SelectItem>
                    </SelectContent>
                  </Select>
               </div>
               <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="font-color" className="text-right">Font Color</Label>
                  <Input id="font-color" type="color" value={transcriptionSettings.color} onChange={(e) => handleTranscriptionSettingChange('color', e.target.value)} className="col-span-3" />
               </div>
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EventSettingsDialog;