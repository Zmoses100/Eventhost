import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tv, Radio, Loader2, ListOrdered, FileQuestion } from 'lucide-react';
import ReactionOverlay from '@/components/virtual/ReactionOverlay';

const SceneContent = ({ scene, mainVideoRef, event, isSharingScreen, qas, isAudience, isLive }) => {
  const mainContent = (
    <video
      ref={mainVideoRef}
      autoPlay
      playsInline
      muted
      className="w-full h-full object-contain transition-all duration-500"
    />
  );
  
  const sceneOverlays = event?.scene_overlays || {};
  const introVideo = sceneOverlays['welcome']?.video_url;
  const outroVideo = sceneOverlays['ending']?.video_url;
  const brandedOverlay = sceneOverlays[scene]?.image_url;

  const renderScene = (content) => (
    <div className="w-full h-full relative">
      {content}
      {brandedOverlay && (
        <img  
          alt="Branded Overlay"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          src="https://images.unsplash.com/photo-1578397825450-70b713d7570e" />
      )}
    </div>
  );

  const WelcomeScreen = () => (
    introVideo ?
      <video src={introVideo} autoPlay loop muted playsInline className="w-full h-full object-cover" /> :
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900 to-indigo-900 text-white">
        <div className="text-center"><h1 className="text-5xl font-bold">Welcome to {event?.title}!</h1><p className="text-2xl mt-4">We'll be starting shortly.</p></div>
      </div>
  );
  
  const EndingScreen = () => (
    outroVideo ?
      <video src={outroVideo} autoPlay loop muted playsInline className="w-full h-full object-cover" /> :
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900 to-gray-900 text-white">
        <div className="text-center"><h1 className="text-5xl font-bold">Thanks for joining!</h1><p className="text-2xl mt-4">This event has now ended.</p></div>
      </div>
  );

  const sceneMap = {
    'welcome': <WelcomeScreen />,
    'ending': <EndingScreen />,
    'survey': <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 text-white"><div className="text-center"><FileQuestion className="h-16 w-16 mx-auto mb-4" /><h1 className="text-5xl font-bold">Feedback Time!</h1><p className="text-2xl mt-4">Please check the interactive panel to complete our survey.</p></div></div>,
    'q&a': <div className="grid grid-cols-2 h-full gap-2 p-2"><div className="col-span-1">{mainContent}</div><div className="col-span-1 bg-black/20 p-4 rounded-lg"><h2 className="text-3xl font-bold text-white mb-4 flex items-center"><ListOrdered className="mr-2" />Q&A Session</h2><div className="space-y-2 overflow-y-auto max-h-[calc(100%-4rem)]">{qas.sort((a, b) => (b.votes || 0) - (a.votes || 0)).map(qa => <div key={qa.id} className="p-2 bg-white/10 rounded"><p className="text-white">{qa.question} ({qa.votes || 0})</p></div>)}</div></div></div>,
    'main-talk': mainContent
  };
  
  if (isAudience && !isLive && scene !== 'welcome') {
     return <div className="text-center text-white/80"><Tv className="h-16 w-16 mx-auto mb-4" /><h2 className="text-2xl font-bold">{event?.title}</h2><p className="text-white/60">The event has not started yet.</p></div>;
  }
  
  if (isAudience && isLive && scene !== 'welcome' && !mainVideoRef.current?.srcObject) {
    return <div className="text-center text-white/80"><Loader2 className="h-16 w-16 mx-auto mb-4 animate-spin" /><h2 className="text-2xl font-bold">Connecting to live stream...</h2></div>;
  }

  return renderScene(sceneMap[scene] || mainContent);
};

const MainVideoDisplay = ({
  event, mainVideoRef, videoRef, interpreterVideoRef,
  isLive, isCameraOn, showInterpreter, lowerThird, transcript, isRecognizing,
  currentScene, isSharingScreen, qas, isAudience = false, eventId
}) => {
  const transcriptionSettings = event?.transcription_settings || { fontSize: '16px', fontWeight: '500', color: '#FFFFFF', background: 'rgba(0, 0, 0, 0.7)' };

  return (
    <div className="aspect-video bg-black rounded-lg flex items-center justify-center relative overflow-hidden">
        <AnimatePresence mode="wait">
            <motion.div
                key={currentScene}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
                className="w-full h-full"
            >
                <SceneContent scene={currentScene} mainVideoRef={mainVideoRef} event={event} isSharingScreen={isSharingScreen} qas={qas} isAudience={isAudience} isLive={isLive} />
            </motion.div>
        </AnimatePresence>

      <ReactionOverlay eventId={eventId} />
      
      {isLive && currentScene !== 'ending' && <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 text-sm font-bold rounded-md flex items-center gap-2 animate-pulse"><Radio className="h-4 w-4" />LIVE</div>}
      
      <AnimatePresence>
        {isCameraOn && !isSharingScreen && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="absolute bottom-4 left-4 w-48 h-36 rounded-lg object-cover border-2 border-purple-500 z-20 overflow-hidden">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          </motion.div>
        )}
      </AnimatePresence>

      {showInterpreter && <div className="absolute bottom-4 right-4 w-48 h-36 rounded-lg object-cover border-2 border-cyan-500 z-20 bg-black flex items-center justify-center text-white/70 text-sm p-2 text-center"><video ref={interpreterVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />Sign Language Interpreter</div>}

      <AnimatePresence>
        {lowerThird && lowerThird.show && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="absolute bottom-0 left-0 right-0 p-4 bg-black/50 backdrop-blur-sm z-10 flex items-center gap-4">
            {lowerThird.image && <img  alt="Sponsor" className="w-12 h-12 object-contain" src="https://images.unsplash.com/photo-1518841252147-00cc0a43dcaf" />}
            <p className="text-white text-lg font-semibold">{lowerThird.text}</p>
          </motion.div>
        )}
      </AnimatePresence>
      
      {isRecognizing && (
        <div 
          className="absolute bottom-0 left-0 right-0 z-10 p-4"
          style={{
            backgroundColor: transcriptionSettings.background
          }}
        >
            <p 
              className="text-center"
              style={{
                fontSize: transcriptionSettings.fontSize,
                fontWeight: transcriptionSettings.fontWeight,
                color: transcriptionSettings.color,
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
              }}
            >
              {transcript || 'Listening...'}
            </p>
        </div>
      )}
    </div>
  );
};

export default MainVideoDisplay;