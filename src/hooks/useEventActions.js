import React from 'react';
import { backendClient } from '@/lib/backendClient';
import { toast } from '@/components/ui/use-toast';

export const useEventActions = (eventId, user, userProfile, onActionSuccess) => {

    const handleInviteSpeaker = async (speaker) => {
        const { error } = await backendClient.from('speakers').insert({
            event_id: eventId,
            user_id: speaker.id,
        });
        if (error) {
            toast({ title: 'Failed to invite speaker', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Speaker invited!', description: `${speaker.name} can now join the greenroom.` });
            onActionSuccess();
        }
    };

    const handleRemoveSpeaker = async (speakerId) => {
        const { error } = await backendClient.from('speakers').delete()
            .eq('event_id', eventId)
            .eq('user_id', speakerId);
        if (error) {
            toast({ title: 'Failed to remove speaker', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Speaker removed.' });
            onActionSuccess();
        }
    };
    
    const sendMessage = async (content) => {
        if (!user?.id) return;
        const { error } = await backendClient.from('messages').insert({
            event_id: eventId,
            user_id: user.id,
            user_name: userProfile?.name || user.email || 'Anonymous',
            role: userProfile?.role || 'Attendee',
            text: content,
        });
        if(error) toast({ title: "Message send failed", description: error.message, variant: "destructive" });
    };

    const handleAddChapter = async (chapter) => {
        const { error } = await backendClient.from('chapters').insert({ event_id: eventId, timestamp_seconds: chapter.timestamp, title: chapter.title });
        if (error) {
            console.error(error);
            toast({ title: 'Failed to add chapter', description: error.message, variant: "destructive" });
        }
        else toast({ title: 'Chapter added!' });
    };

    const handleAskQuestion = async (question) => {
        if (!user?.id) return;
        const { error } = await backendClient.from('qas').insert({ event_id: eventId, user_id: user.id, question, author_name: userProfile?.name || user.email || 'Anonymous', votes: 0, is_answered: false });
        if(error) toast({ title: 'Failed to ask question', description: error.message, variant: 'destructive' });
    };

    const handleVoteQuestion = async (qaId) => {
        const { error } = await backendClient.rpc('vote_qa', { qa_id_to_vote: qaId, user_id_voting: user.id });
        if(error) toast({ title: 'Vote failed', description: error.message, variant: 'destructive' });
    };

    const handleMarkQuestionAsAnswered = async (qaId) => {
        const { error } = await backendClient.from('qas').update({ is_answered: true }).eq('id', qaId);
        if (error) {
            toast({ title: 'Failed to update question', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Question marked as answered.' });
        }
    };

    const handleCreatePoll = async ({ question, options }) => {
        const { error } = await backendClient.from('polls').insert({ event_id: eventId, question, options: options.map(o => ({...o, votes: 0})), is_active: true });
        if (error) {
            console.error(error);
            toast({ title: 'Failed to create poll', description: error.message, variant: 'destructive' });
        }
        else toast({title: "Poll is now live!"});
    };
    
    const handleVotePoll = async (pollId, optionIndex) => {
        const { error } = await backendClient.rpc('vote_poll', { poll_id_to_vote: pollId, option_index_to_vote: optionIndex });
        if(error) toast({ title: 'Poll vote failed', description: error.message, variant: 'destructive' });
    };
    
    const handleCreateQuiz = async (quizData) => {
        const { error } = await backendClient.from('quizzes').insert({ event_id: eventId, ...quizData, is_active: true });
        if (error) {
            console.error(error);
            toast({ title: 'Failed to create quiz', description: error.message, variant: 'destructive' });
        }
        else toast({title: "Quiz created!"});
    };

    const handleAnswerQuiz = async (quizId, optionIndex, callback) => {
        const { data: quiz, error } = await backendClient.from('quizzes').select('correct_option_index').eq('id', quizId).maybeSingle();
        if (error || !quiz) {
            toast({ title: "Couldn't verify answer", description: error?.message || 'Quiz not found', variant: "destructive" });
            return;
        }
        callback(quiz.correct_option_index === optionIndex);
    };

    const handleDropLink = async (linkData) => {
        const { error } = await backendClient.from('shared_links').insert({ event_id: eventId, ...linkData, is_active: true });
        if (error) {
            console.error(error);
            toast({ title: 'Failed to share link', description: error.message, variant: 'destructive' });
        }
        else toast({title: "Link shared!"});
    };

    const handleCreateCta = async (ctaData) => {
        const { error } = await backendClient.from('ctas').insert({ event_id: eventId, ...ctaData, is_active: true });
        if (error) {
            console.error(error);
            toast({ title: 'Failed to create CTA', description: error.message, variant: 'destructive' });
        }
        else toast({title: "CTA is live!"});
    };

    const handleUpdateEventSettings = async (settings) => {
      const { error } = await backendClient.from('events').update(settings).eq('id', eventId);
      if (error) {
          toast({ title: 'Failed to update settings', description: error.message, variant: 'destructive' });
      } else {
          toast({ title: 'Event settings updated!' });
          onActionSuccess();
      }
    };

    const handleUnsupportedFeature = () => toast({
        title: "🚧 Feature not implemented yet!",
        description: "Stay tuned for more updates.",
    });

    return {
        handleInviteSpeaker,
        handleRemoveSpeaker,
        sendMessage,
        handleAddChapter,
        handleAskQuestion,
        handleVoteQuestion,
        handleMarkQuestionAsAnswered,
        handleCreatePoll,
        handleVotePoll,
        handleCreateQuiz,
        handleAnswerQuiz,
        handleDropLink,
        handleCreateCta,
        handleUpdateEventSettings,
        handleUnsupportedFeature
    };
}