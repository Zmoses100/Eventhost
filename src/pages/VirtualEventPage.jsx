import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ShoppingBag, Download, Loader2, CheckSquare, Hand } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { useStripe } from '@stripe/react-stripe-js';
import { backendClient } from '@/lib/backendClient';

import { useVirtualEvent } from '@/hooks/useVirtualEvent';
import { useMediaControls } from '@/hooks/useMediaControls';

import Greenroom from '@/components/virtual/Greenroom';
import InteractiveLayer from '@/components/virtual/InteractiveLayer';
import CoWatchRoom from '@/components/virtual/CoWatchRoom';
import VideoControls from '@/components/virtual/VideoControls';
import MainVideoDisplay from '@/components/virtual/MainVideoDisplay';
import ChatPanel from '@/components/virtual/ChatPanel';
import ReactionBar from '@/components/virtual/ReactionBar';

const SceneContent = ({ scene, qas, onMarkQuestionAsAnswered, canControl }) => {
    switch (scene) {
        case 'q&a':
            return (
                <div className="p-4">
                    <h2 className="text-2xl font-bold text-white mb-4">Q&A Session</h2>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                        {qas.sort((a, b) => b.votes - a.votes).map(qa => (
                            <div key={qa.id} className={`p-3 rounded-lg ${qa.is_answered ? 'bg-green-900/50' : 'bg-white/10'}`}>
                                <p className="text-white">{qa.question}</p>
                                <div className="flex justify-between items-center mt-2">
                                    <span className="text-xs text-white/60">by {qa.author_name} - {qa.votes} votes</span>
                                    {canControl && !qa.is_answered && (
                                        <Button size="sm" variant="outline" className="bg-green-500/20 border-green-500/50 hover:bg-green-500/40" onClick={() => onMarkQuestionAsAnswered(qa.id)}>
                                            <CheckSquare className="h-4 w-4 mr-2" /> Mark as Answered
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        default:
            return null;
    }
};


const VirtualEventPage = () => {
  const { eventId } = useParams();
  const {
    user, userProfile, event, loading,
    videoRef, mainVideoRef, interpreterVideoRef,
    stream, screenStream, isCameraOn, isMicOn, isSharingScreen, showInterpreter, isCoWatchOpen,
    messages, isLive, currentScene, lowerThird,
    qas, polls, quizzes, links, ctas, canControlEvent, raisedHands,
    setStream, setScreenStream, setIsCameraOn, setIsMicOn, setIsSharingScreen, setShowInterpreter,
    setCoWatchOpen, handleGoLive, handleStopLive, handleInviteSpeaker, handleRemoveSpeaker,
    sendMessage, handleAddChapter, handleUnsupportedFeature,
    handleAskQuestion, handleVoteQuestion, handleCreatePoll, handleVotePoll,
    handleCreateQuiz, handleAnswerQuiz, handleDropLink, handleCreateCta,
    handleSceneChange, handleLowerThirdChange, handleUpdateEventSettings,
    handleMarkQuestionAsAnswered, handleRaiseHand, handleLowerHand, handleSendReaction
  } = useVirtualEvent();

  const [isHandRaised, setIsHandRaised] = useState(false);

  useEffect(() => {
    if (raisedHands && user) {
      setIsHandRaised(raisedHands.some(h => h.user_id === user.id));
    }
  }, [raisedHands, user]);

  const {
    toggleCamera, toggleMic, toggleScreenShare, toggleRecording, toggleSpeechRecognition,
    isRecording, recordingUrl, isUploading,
    isRecognizing, transcript, transcriptionLang, setTranscriptionLang
  } = useMediaControls(setStream, setScreenStream, isCameraOn, setIsCameraOn, isMicOn, setIsMicOn, isSharingScreen, setIsSharingScreen, eventId, event);

  const stripe = useStripe();
  const [finalRecordingUrl, setFinalRecordingUrl] = useState(null);
  const [hasDownloaded, setHasDownloaded] = useState(false);

  useEffect(() => {
    const newUrl = event?.recording_url || recordingUrl;
    if (newUrl && newUrl !== finalRecordingUrl) {
      setFinalRecordingUrl(newUrl);
      setHasDownloaded(event?.recording_downloaded || false);
    } else if (!newUrl) {
      setFinalRecordingUrl(null);
    }
  }, [event?.recording_url, event?.recording_downloaded, recordingUrl, finalRecordingUrl]);

  const handleDownloadClick = async () => {
    setHasDownloaded(true);
    toast({ title: "Recording downloaded successfully.", description: "Your recording file is being saved." });
    
    const { error } = await backendClient
      .from('events')
      .update({ recording_downloaded: true })
      .eq('id', eventId);

    if (error) {
      console.error("Failed to update download status:", error);
      toast({ title: "Could not save download status", description: "The button might reappear on refresh.", variant: "destructive" });
    }
  };

  const handleSendTip = async () => {
    if (!stripe) {
      toast({ title: "Stripe is not ready.", variant: "destructive" });
      return;
    }
    if (!event?.tip_price_id) {
      toast({ 
        title: "Tipping is not enabled", 
        description: "The event organizer hasn't set up tipping for this event yet.", 
        variant: "destructive" 
      });
      return;
    }

    const { error } = await stripe.redirectToCheckout({
      lineItems: [{ price: event.tip_price_id, quantity: 1 }],
      mode: 'payment',
      successUrl: `${window.location.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&eventId=${event.id}`,
      cancelUrl: window.location.href,
      customerEmail: userProfile?.email,
    });

    if (error) {
      toast({ title: "Payment failed", description: error.message, variant: "destructive" });
    }
  };

  const handleInstantReplay = () => {
    if (mainVideoRef.current) {
      mainVideoRef.current.currentTime = Math.max(0, mainVideoRef.current.currentTime - 10);
      toast({ title: 'Rewind 10 seconds' });
    }
  };

  const handleSeekToChapter = (timestamp) => {
    if (mainVideoRef.current) mainVideoRef.current.currentTime = timestamp;
  };
  
  if (loading) return <div className="pt-24 min-h-screen flex items-center justify-center text-white text-xl"><Loader2 className="h-8 w-8 animate-spin mr-3" />Joining event...</div>;
  if (!event?.is_virtual) return <div className="pt-24 min-h-screen flex items-center justify-center text-center"><div><h2 className="text-2xl font-bold text-white mb-4">Virtual Event Not Found</h2><Link to="/"><Button className="bg-white text-purple-600 hover:bg-white/90"><ArrowLeft className="h-4 w-4 mr-2" />Back to Events</Button></Link></div></div>;
  
  const isLiveShop = event.category === 'live-shop';

  const ViewForAudience = () => (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3 space-y-6">
        <Card className="glass-effect border-white/20">
          <CardContent className="p-2 md:p-4">
            <MainVideoDisplay 
              event={event} mainVideoRef={mainVideoRef} eventId={eventId}
              isLive={isLive}
              currentScene={currentScene}
              lowerThird={lowerThird || {}}
              qas={qas}
              isAudience={true}
            />
             <div className="mt-4 flex flex-col md:flex-row justify-between items-start px-2 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">{event.title}</h1>
                    <p className="text-white/70">by {event.profiles?.name || "Organizer"}</p>
                </div>
                <div className="flex items-center gap-2">
                    <ReactionBar onReact={handleSendReaction} />
                    <Button onClick={isHandRaised ? () => handleLowerHand() : handleRaiseHand} variant={isHandRaised ? "default" : "outline"} className={`transition-all ${isHandRaised ? 'bg-yellow-500 text-black hover:bg-yellow-600' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                        <Hand className="h-4 w-4 mr-2" /> {isHandRaised ? 'Lower Hand' : 'Raise Hand'}
                    </Button>
                </div>
              </div>
          </CardContent>
        </Card>
        {isLiveShop && <Card className="glass-effect border-white/20"><CardHeader><CardTitle className="text-xl text-white flex items-center"><ShoppingBag className="h-5 w-5 mr-2" />Live Shop</CardTitle></CardHeader><CardContent> {/* Live shop items */} </CardContent></Card>}
        <InteractiveLayer 
          qas={qas} onAskQuestion={handleAskQuestion} onVoteQuestion={handleVoteQuestion}
          polls={polls} onVotePoll={handleVotePoll} onCreatePoll={handleCreatePoll}
          quizzes={quizzes} onCreateQuiz={handleCreateQuiz} onAnswerQuiz={handleAnswerQuiz}
          links={links} onDropLink={handleDropLink}
          ctas={ctas} onCreateCta={handleCreateCta}
          canControl={false}
        />
      </div>
      <div className="lg:col-span-1">
        <ChatPanel messages={messages} onSendMessage={sendMessage} onStartCoWatch={() => setCoWatchOpen(true)} onUnsupportedFeature={handleUnsupportedFeature} onSendTip={handleSendTip} />
      </div>
    </div>
  );
  
  const ViewForControl = () => (
     <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3 space-y-6">
          <Card className="glass-effect border-white/20">
            <CardContent className="p-2 md:p-4">
              <MainVideoDisplay 
                event={event} mainVideoRef={mainVideoRef} videoRef={videoRef} interpreterVideoRef={interpreterVideoRef}
                isLive={isLive} isCameraOn={isCameraOn} showInterpreter={showInterpreter} lowerThird={lowerThird || {}}
                transcript={transcript} isRecognizing={isRecognizing}
                currentScene={currentScene} isSharingScreen={isSharingScreen} qas={qas} eventId={eventId}
              />
              <div className="mt-4 flex flex-col md:flex-row justify-between items-start px-2 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">{event.title}</h1>
                    <p className="text-white/70">by {event.profiles?.name || "Organizer"}</p>
                </div>
                {canControlEvent && (
                  <div className="flex items-center gap-4">
                    <VideoControls 
                        isCameraOn={isCameraOn} isMicOn={isMicOn} isSharingScreen={isSharingScreen} isRecording={isRecording} 
                        showInterpreter={showInterpreter} isRecognizing={isRecognizing} transcriptionLang={transcriptionLang}
                        toggleCamera={toggleCamera} toggleMic={toggleMic} toggleScreenShare={toggleScreenShare} toggleRecording={() => toggleRecording(screenStream || stream)}
                        toggleInterpreter={() => setShowInterpreter(!showInterpreter)} toggleSpeechRecognition={toggleSpeechRecognition} setTranscriptionLang={setTranscriptionLang}
                        handleInstantReplay={handleInstantReplay} handleSeekToChapter={handleSeekToChapter} eventId={eventId}
                    />
                    <Button onClick={isHandRaised ? () => handleLowerHand() : handleRaiseHand} variant={isHandRaised ? "default" : "outline"} className={`transition-all ${isHandRaised ? 'bg-yellow-500 text-black hover:bg-yellow-600' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                        <Hand className="h-4 w-4 mr-2" /> {isHandRaised ? 'Lower Hand' : 'Raise Hand'}
                    </Button>
                  </div>
                )}
              </div>
              {isUploading && <div className="mt-4 text-center text-white/80 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Uploading recording...</div>}
              {finalRecordingUrl && !isUploading && !hasDownloaded && (
                  <div className="mt-4 text-center">
                    <a href={finalRecordingUrl} download={`event-recording-${event.id}.webm`} onClick={handleDownloadClick}>
                      <Button className="bg-green-500 hover:bg-green-600 text-white"><Download className="h-4 w-4 mr-2"/>Download Recording</Button>
                    </a>
                  </div>
              )}
            </CardContent>
          </Card>

          <Greenroom 
            isLive={isLive}
            onGoLive={handleGoLive} 
            onStopLive={handleStopLive}
            event={event} 
            onSceneChange={handleSceneChange} onLowerThirdChange={handleLowerThirdChange} 
            onInviteSpeaker={handleInviteSpeaker} onRemoveSpeaker={handleRemoveSpeaker} onAddChapter={(title) => handleAddChapter({title, timestamp: mainVideoRef.current?.currentTime || 0})}
            onUpdateEventSettings={handleUpdateEventSettings}
            raisedHands={raisedHands} onLowerHand={handleLowerHand}
          />
           <InteractiveLayer 
              qas={qas} onAskQuestion={handleAskQuestion} onVoteQuestion={handleVoteQuestion} onMarkQuestionAsAnswered={handleMarkQuestionAsAnswered}
              polls={polls} onVotePoll={handleVotePoll} onCreatePoll={handleCreatePoll}
              quizzes={quizzes} onCreateQuiz={handleCreateQuiz} onAnswerQuiz={handleAnswerQuiz}
              links={links} onDropLink={handleDropLink}
              ctas={ctas} onCreateCta={handleCreateCta}
              canControl={canControlEvent}
            />
      </div>

      <div className="lg:col-span-1">
        <ChatPanel messages={messages} onSendMessage={sendMessage} onStartCoWatch={() => setCoWatchOpen(true)} onUnsupportedFeature={handleUnsupportedFeature} onSendTip={handleSendTip} />
      </div>
    </div>
  );


  return (
    <div className="pt-24 pb-12 px-4 min-h-screen">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-8xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link to={`/host/${eventId}`} className="inline-flex items-center text-white/80 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-2" />Exit Greenroom
          </Link>
        </div>
        
        {canControlEvent ? <ViewForControl /> : <ViewForAudience />}

      </motion.div>
      <CoWatchRoom open={isCoWatchOpen} onOpenChange={setCoWatchOpen} mainStream={isSharingScreen ? screenStream : stream} />
    </div>
  );
};

export default VirtualEventPage;