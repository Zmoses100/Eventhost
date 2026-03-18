import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';

const DropLinkDialog = ({ open, onOpenChange, onCreate }) => {
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');

  const handleSubmit = () => {
    if (!text.trim() || !url.trim()) {
      toast({ title: "Both fields are required.", variant: "destructive" });
      return;
    }
    try {
      new URL(url);
    } catch (_) {
      toast({ title: "Please enter a valid URL.", variant: "destructive" });
      return;
    }
    onCreate({ text, url });
    setText('');
    setUrl('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-effect">
        <DialogHeader><DialogTitle className="text-white">Drop a Link</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="link-text" className="text-white/80">Display Text</Label>
            <Input id="link-text" placeholder="e.g., Check out our website!" value={text} onChange={(e) => setText(e.target.value)} className="bg-white/10 border-white/20 text-white" />
          </div>
          <div>
            <Label htmlFor="link-url" className="text-white/80">URL</Label>
            <Input id="link-url" placeholder="https://example.com" value={url} onChange={(e) => setUrl(e.target.value)} className="bg-white/10 border-white/20 text-white" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} className="bg-white text-purple-600 hover:bg-white/90">Share Link</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DropLinkDialog;