import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, PlusCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const CreatePollDialog = ({ open, onOpenChange, onCreate }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    if (options.length < 5) {
      setOptions([...options, '']);
    } else {
      toast({ title: "Maximum of 5 options allowed.", variant: "destructive" });
    }
  };
  
  const removeOption = (index) => {
     if (options.length > 2) {
        setOptions(options.filter((_, i) => i !== index));
     } else {
        toast({ title: "Minimum of 2 options required.", variant: "destructive" });
     }
  };

  const handleSubmit = () => {
    if (question && options.every(o => o)) {
      onCreate({ question, options: options.map(o => ({ text: o, votes: 0 })) });
      setQuestion('');
      setOptions(['', '']);
    } else {
        toast({ title: "Please fill out the question and all options.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-effect">
        <DialogHeader><DialogTitle className="text-white">Create New Poll</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Input placeholder="Poll Question" value={question} onChange={(e) => setQuestion(e.target.value)} className="bg-white/10 border-white/20 text-white" />
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input placeholder={`Option ${index + 1}`} value={option} onChange={(e) => handleOptionChange(index, e.target.value)} className="bg-white/10 border-white/20 text-white" />
              <Button size="icon" variant="destructive" onClick={() => removeOption(index)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button variant="outline" onClick={addOption} className="bg-white/10 border-white/20 hover:bg-white/20 w-full"><PlusCircle className="mr-2 h-4 w-4"/>Add Option</Button>
        </div>
        <DialogFooter>
            <Button onClick={handleSubmit} className="bg-white text-purple-600 hover:bg-white/90">Create Poll</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


export default CreatePollDialog;