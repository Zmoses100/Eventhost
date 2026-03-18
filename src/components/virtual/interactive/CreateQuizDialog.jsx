import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, PlusCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const CreateQuizDialog = ({ open, onOpenChange, onCreate }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [correctOptionIndex, setCorrectOptionIndex] = useState(null);

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    if (options.length < 4) {
      setOptions([...options, '']);
    } else {
      toast({ title: "Maximum of 4 options allowed.", variant: "destructive" });
    }
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
      if (correctOptionIndex === index) {
        setCorrectOptionIndex(null);
      } else if (correctOptionIndex > index) {
        setCorrectOptionIndex(correctOptionIndex - 1);
      }
    } else {
      toast({ title: "Minimum of 2 options required.", variant: "destructive" });
    }
  };

  const handleSubmit = () => {
    if (!question.trim()) {
      toast({ title: "Question cannot be empty.", variant: "destructive" });
      return;
    }
    if (options.some(opt => !opt.trim())) {
      toast({ title: "All options must be filled.", variant: "destructive" });
      return;
    }
    if (correctOptionIndex === null) {
      toast({ title: "Please select a correct answer.", variant: "destructive" });
      return;
    }
    
    onCreate({ question, options, correctOptionIndex });
    setQuestion('');
    setOptions(['', '']);
    setCorrectOptionIndex(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-effect">
        <DialogHeader><DialogTitle className="text-white">Create New Quiz</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Input placeholder="Quiz Question" value={question} onChange={(e) => setQuestion(e.target.value)} className="bg-white/10 border-white/20 text-white" />
          <Label className="text-white">Options (select the correct one)</Label>
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <Button 
                variant={correctOptionIndex === index ? 'default' : 'outline'}
                className={`w-full justify-start ${correctOptionIndex === index ? 'bg-green-500 hover:bg-green-600' : 'bg-white/10 border-white/20 hover:bg-white/20'}`}
                onClick={() => setCorrectOptionIndex(index)}
              >
                <Input placeholder={`Option ${index + 1}`} value={option} onChange={(e) => handleOptionChange(index, e.target.value)} className="bg-transparent border-none focus:ring-0 text-white" />
              </Button>
              <Button size="icon" variant="destructive" onClick={() => removeOption(index)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button variant="outline" onClick={addOption} className="bg-white/10 border-white/20 hover:bg-white/20 w-full"><PlusCircle className="mr-2 h-4 w-4"/>Add Option</Button>
        </div>
        <DialogFooter>
            <Button onClick={handleSubmit} className="bg-white text-purple-600 hover:bg-white/90">Create Quiz</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateQuizDialog;