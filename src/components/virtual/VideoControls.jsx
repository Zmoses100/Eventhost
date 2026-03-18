import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Video, Mic, ScreenShare, StopCircle, Languages, PictureInPicture2,
  VideoOff, MicOff, Rewind, FolderClock
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/lib/customSupabaseClient';

const ChapterItem = ({ chapter, onSelect }) => (
  <button
    onClick={() => onSelect(chapter.timestamp_seconds)}
    className="w-full text-left p-2 text-sm text-white/90 hover:bg-white/10 rounded-md"
  >
    <span className="font-mono text-xs text-purple-300 mr-2">
      {new Date(chapter.timestamp_seconds * 1000).toISOString().substr(14, 5)}
    </span>
    {chapter.title}
  </button>
);

const ViewChapters = ({ eventId, onSeek }) => {
  const [chapters, setChapters] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchChapters = async () => {
        const { data, error } = await supabase
          .from('chapters')
          .select('*')
          .eq('event_id', eventId)
          .order('timestamp_seconds', { ascending: true });
        if (!error) {
          setChapters(data);
        }
      };
      fetchChapters();
    }
  }, [eventId, isOpen]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
          <FolderClock className="h-4 w-4 mr-2" />View Chapters
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 bg-background/80 backdrop-blur-sm border-white/20 p-2">
        <div className="space-y-2">
          <h4 className="font-bold text-white p-2">Event Chapters</h4>
          {chapters.length > 0 ? (
            chapters.map(chapter => (
              <ChapterItem key={chapter.id} chapter={chapter} onSelect={(time) => { onSeek(time); setIsOpen(false); }} />
            ))
          ) : (
            <p className="text-sm text-white/70 text-center p-4">No chapters marked yet.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};


const VideoControls = ({
  isCameraOn, isMicOn, isSharingScreen, isRecording, showInterpreter, isRecognizing, transcriptionLang,
  toggleCamera, toggleMic, toggleScreenShare, toggleRecording, toggleInterpreter, toggleSpeechRecognition, setTranscriptionLang,
  handleInstantReplay, handleSeekToChapter, eventId
}) => {
  return (
    <>
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <Button onClick={toggleCamera} title="Toggle Camera" className={`${isCameraOn ? 'bg-purple-600' : 'bg-white/10'} hover:bg-purple-700 text-white`}>
            {isCameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>
          <Button onClick={toggleMic} title="Toggle Microphone" className={`${isMicOn ? 'bg-purple-600' : 'bg-white/10'} hover:bg-purple-700 text-white`}>
            {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>
          <Button onClick={toggleScreenShare} title="Share Screen" className={`${isSharingScreen ? 'bg-blue-500/80' : 'bg-white/10'} hover:bg-white/20 text-white`}><ScreenShare className="h-5 w-5"/></Button>
          <Button onClick={toggleRecording} title="Record Stream" className={`${isRecording ? 'bg-red-500/80' : 'bg-white/10'} hover:bg-white/20 text-white`}>
            {isRecording ? <StopCircle className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </Button>
          <Button onClick={toggleInterpreter} title="Sign Language Interpreter" className={`${showInterpreter ? 'bg-cyan-500/80' : 'bg-white/10'} hover:bg-white/20 text-white`}><PictureInPicture2 className="h-5 w-5"/></Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-center">
           <Button onClick={toggleSpeechRecognition} className={`${isRecognizing ? 'bg-green-500/80' : 'bg-white/10'} hover:bg-white/20 text-white`}><Languages className="h-5 w-5" /></Button>
           <Select onValueChange={setTranscriptionLang} defaultValue={transcriptionLang}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white w-[180px]"><SelectValue placeholder="Transcription Language" /></SelectTrigger>
              <SelectContent>
                  <SelectItem value="en-US">English</SelectItem>
                  <SelectItem value="pt-BR">Portuguese</SelectItem>
                  <SelectItem value="fr-FR">French</SelectItem>
                  <SelectItem value="es-ES">Spanish</SelectItem>
              </SelectContent>
           </Select>
           <Button onClick={handleInstantReplay} variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20"><Rewind className="h-4 w-4 mr-2" />Instant Replay</Button>
           <ViewChapters eventId={eventId} onSeek={handleSeekToChapter} />
        </div>
      </div>
    </>
  );
};

export default VideoControls;