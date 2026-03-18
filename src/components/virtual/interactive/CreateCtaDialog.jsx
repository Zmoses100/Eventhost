import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';

const CreateCtaDialog = ({ open, onOpenChange, onCreate }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [url, setUrl] = useState('');

  const handleSubmit = () => {
    if (!title.trim() || !buttonText.trim() || !url.trim()) {
      toast({ title: "Title, Button Text, and URL are required.", variant: "destructive" });
      return;
    }
    try {
      new URL(url);
    } catch (_) {
      toast({ title: "Please enter a valid URL.", variant: "destructive" });
      return;
    }
    onCreate({ title, description, buttonText, url });
    setTitle('');
    setDescription('');
    setButtonText('');
    setUrl('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-effect">
        <DialogHeader><DialogTitle className="text-white">Create Call-to-Action</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="cta-title" className="text-white/80">Title</Label>
            <Input id="cta-title" placeholder="e.g., Special Offer!" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-white/10 border-white/20 text-white" />
          </div>
          <div>
            <Label htmlFor="cta-description" className="text-white/80">Description (optional)</Label>
            <Textarea id="cta-description" placeholder="e.g., Get 20% off for the next hour." value={description} onChange={(e) => setDescription(e.target.value)} className="bg-white/10 border-white/20 text-white" />
          </div>
          <div>
            <Label htmlFor="cta-button" className="text-white/80">Button Text</Label>
            <Input id="cta-button" placeholder="e.g., Claim Now" value={buttonText} onChange={(e) => setButtonText(e.target.value)} className="bg-white/10 border-white/20 text-white" />
          </div>
          <div>
            <Label htmlFor="cta-url" className="text-white/80">URL</Label>
            <Input id="cta-url" placeholder="https://example.com/offer" value={url} onChange={(e) => setUrl(e.target.value)} className="bg-white/10 border-white/20 text-white" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} className="bg-white text-purple-600 hover:bg-white/90">Launch CTA</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCtaDialog;