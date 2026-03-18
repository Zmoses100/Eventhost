import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';

const AddChapterDialog = ({ open, onOpenChange, onAddChapter }) => {
  const [title, setTitle] = useState('');

  const handleAdd = () => {
    if (title.trim()) {
      onAddChapter(title.trim());
      setTitle('');
    } else {
      toast({ title: 'Chapter title cannot be empty', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-effect">
        <DialogHeader><DialogTitle className="text-white">Add New Chapter</DialogTitle></DialogHeader>
        <div className="py-4">
          <Label htmlFor="chapter-title" className="text-white/80">Chapter Title</Label>
          <Input id="chapter-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Opening Remarks" className="mt-2 bg-white/10 border-white/20 text-white" />
        </div>
        <DialogFooter>
          <DialogClose asChild><Button onClick={handleAdd}>Add Chapter</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddChapterDialog;