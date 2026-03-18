import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThumbsUp, MessageCircle, BarChart2, Link2, Bell, PlusCircle, Send, CheckCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import CreatePollDialog from '@/components/virtual/interactive/CreatePollDialog';
import CreateQuizDialog from '@/components/virtual/interactive/CreateQuizDialog';
import DropLinkDialog from '@/components/virtual/interactive/DropLinkDialog';
import CreateCtaDialog from '@/components/virtual/interactive/CreateCtaDialog';

const InteractiveLayer = ({
  qas, onAskQuestion, onVoteQuestion, onMarkQuestionAsAnswered,
  polls, onVotePoll, onCreatePoll,
  quizzes, onAnswerQuiz, onCreateQuiz,
  links, onDropLink,
  ctas, onCreateCta,
  canControl
}) => {
  const [newQuestion, setNewQuestion] = useState('');
  const [isPollDialogOpen, setPollDialogOpen] = useState(false);
  const [isQuizDialogOpen, setQuizDialogOpen] = useState(false);
  const [isLinkDialogOpen, setLinkDialogOpen] = useState(false);
  const [isCtaDialogOpen, setCtaDialogOpen] = useState(false);

  const handleAskQuestion = (e) => {
    e.preventDefault();
    if (newQuestion.trim()) {
      onAskQuestion(newQuestion);
      setNewQuestion('');
    }
  };

  const totalVotes = (poll) => poll.options.reduce((sum, opt) => sum + opt.votes, 0);

  const handleQuizAnswer = (quizId, optionIndex) => {
    onAnswerQuiz(quizId, optionIndex, (isCorrect) => {
        toast({
            title: isCorrect ? "Correct!" : "Not quite!",
            description: isCorrect ? "Great job!" : "Try the next one!",
            variant: isCorrect ? "default" : "destructive",
            className: isCorrect ? "bg-green-500 text-white border-green-600" : "bg-red-500 text-white border-red-600",
        });
    });
  };

  return (
    <>
      <Tabs defaultValue="q&a" className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-white/5">
          <TabsTrigger value="q&a"><MessageCircle className="h-4 w-4" /> Q&A</TabsTrigger>
          <TabsTrigger value="polls"><BarChart2 className="h-4 w-4" /> Polls</TabsTrigger>
          <TabsTrigger value="quizzes">? Quizzes</TabsTrigger>
          <TabsTrigger value="links"><Link2 className="h-4 w-4" /> Links</TabsTrigger>
          <TabsTrigger value="cta"><Bell className="h-4 w-4" /> CTA</TabsTrigger>
        </TabsList>

        <div className="p-4 bg-white/5 rounded-b-lg min-h-[250px]">
          <TabsContent value="q&a">
            <div className="space-y-3">
              <AnimatePresence>
                {qas.sort((a, b) => b.votes - a.votes).map((qa) => (
                  <motion.div key={qa.id} layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`flex justify-between items-center p-2 rounded ${qa.is_answered ? 'bg-green-900/30' : 'bg-white/5'}`}>
                    <div>
                      <p className="text-sm text-white/90">{qa.question}</p>
                      <p className="text-xs text-white/60">by {qa.author_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" className="text-white/70 hover:text-white" onClick={() => onVoteQuestion(qa.id)}>
                        <ThumbsUp className="h-4 w-4 mr-1" /> {qa.votes}
                      </Button>
                      {canControl && !qa.is_answered && (
                        <Button size="sm" variant="ghost" className="text-green-400 hover:text-green-300" onClick={() => onMarkQuestionAsAnswered(qa.id)}>
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <form onSubmit={handleAskQuestion} className="flex gap-2 mt-4">
              <Input placeholder="Ask a question..." value={newQuestion} onChange={e => setNewQuestion(e.target.value)} className="bg-white/10 border-white/20 text-white placeholder:text-white/60" />
              <Button type="submit" size="icon"><Send className="h-4 w-4" /></Button>
            </form>
          </TabsContent>
          <TabsContent value="polls">
            {polls.length > 0 ? (
              <div className="space-y-4">
                {polls.map(poll => (
                  <div key={poll.id}>
                    <p className="font-bold text-white mb-2">{poll.question}</p>
                    <div className="space-y-2">
                      {poll.options.map((option, index) => (
                        <Button key={index} variant="outline" className="w-full justify-start bg-white/5 border-white/10" onClick={() => onVotePoll(poll.id, index)}>
                          <div className="absolute left-0 top-0 h-full bg-purple-500/30" style={{ width: `${(option.votes / (totalVotes(poll) || 1)) * 100}%` }}></div>
                          <span className="relative z-10">{option.text} ({option.votes})</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-center text-sm text-white/70 py-4">No active polls.</p>}
            {canControl && <Button onClick={() => setPollDialogOpen(true)} size="sm" className="mt-4 w-full"><PlusCircle className="h-4 w-4 mr-2" />Create Poll</Button>}
          </TabsContent>
          <TabsContent value="quizzes">
            {quizzes.length > 0 ? (
                <div className="space-y-4">
                    {quizzes.map(quiz => (
                        <div key={quiz.id}>
                            <p className="font-bold text-white mb-2">{quiz.question}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {quiz.options.map((option, index) => (
                                    <Button key={index} variant="outline" className="w-full justify-start bg-white/5 border-white/10" onClick={() => handleQuizAnswer(quiz.id, index)}>
                                        {option}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : <p className="text-center text-sm text-white/70 py-4">No active quizzes.</p>}
            {canControl && <Button onClick={() => setQuizDialogOpen(true)} size="sm" className="w-full mt-4">Create Quiz</Button>}
          </TabsContent>
          <TabsContent value="links">
             {links.length > 0 ? (
                <div className="space-y-2">
                  {links.map(link => (
                    <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="link" className="text-cyan-300">{link.text}</Button>
                    </a>
                  ))}
                </div>
            ) : <p className="text-center text-sm text-white/70 py-4">No links shared.</p>}
            {canControl && <Button onClick={() => setLinkDialogOpen(true)} size="sm" className="w-full mt-4">Drop a Link</Button>}
          </TabsContent>
          <TabsContent value="cta">
            {ctas.length > 0 ? (
              <div className="space-y-4">
                {ctas.map(cta => (
                  <div key={cta.id} className="text-center p-4 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600">
                      <h3 className="text-xl font-bold text-white">{cta.title}</h3>
                      <p className="text-white/80 my-2">{cta.description}</p>
                      <a href={cta.url} target="_blank" rel="noopener noreferrer">
                          <Button className="bg-white text-purple-600 hover:bg-white/90 mt-2">{cta.button_text}</Button>
                      </a>
                  </div>
                ))}
              </div>
            ) : <p className="text-center text-sm text-white/70 py-4">No active CTA.</p>}
            {canControl && <Button onClick={() => setCtaDialogOpen(true)} size="sm" className="w-full mt-4">Create CTA</Button>}
          </TabsContent>
        </div>
      </Tabs>
      <CreatePollDialog key="create-poll-dialog" open={isPollDialogOpen} onOpenChange={setPollDialogOpen} onCreate={(pollData) => { onCreatePoll(pollData); setPollDialogOpen(false); }} />
      <CreateQuizDialog key="create-quiz-dialog" open={isQuizDialogOpen} onOpenChange={setQuizDialogOpen} onCreate={(quizData) => { onCreateQuiz(quizData); setQuizDialogOpen(false); }} />
      <DropLinkDialog key="drop-link-dialog" open={isLinkDialogOpen} onOpenChange={setLinkDialogOpen} onCreate={(linkData) => { onDropLink(linkData); setLinkDialogOpen(false); }} />
      <CreateCtaDialog key="create-cta-dialog" open={isCtaDialogOpen} onOpenChange={setCtaDialogOpen} onCreate={(ctaData) => { onCreateCta(ctaData); setCtaDialogOpen(false); }} />
    </>
  );
};

export default InteractiveLayer;