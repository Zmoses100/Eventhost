import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import { backendClient } from '@/lib/backendClient';
import { v4 as uuidv4 } from 'uuid';

const qualitySettings = {
  '720p': { width: { ideal: 1280 }, height: { ideal: 720 } },
  '1080p': { width: { ideal: 1920 }, height: { ideal: 1080 } },
  '1440p': { width: { ideal: 2560 }, height: { ideal: 1440 } },
  '4k': { width: { ideal: 3840 }, height: { ideal: 2160 } },
  '8k': { width: { ideal: 7680 }, height: { ideal: 4320 } },
};

export const useMediaControls = (setStream, setScreenStream, isCameraOn, setIsCameraOn, isMicOn, setIsMicOn, isSharingScreen, setIsSharingScreen, eventId, eventSettings) => {
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const isRecognizingRef = useRef(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [transcriptionLang, setTranscriptionLang] = useState('en-US');

  const getMediaStream = useCallback(async (video, audio) => {
    const videoConstraints = video ? (qualitySettings[eventSettings?.recording_quality] || qualitySettings['1080p']) : false;
    const audioConstraints = audio ? {
        echoCancellation: eventSettings?.audio_enhancements !== false,
        noiseSuppression: eventSettings?.audio_enhancements !== false,
        autoGainControl: eventSettings?.audio_enhancements !== false,
    } : false;
    
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: audioConstraints });
      setStream(newStream);
      return newStream;
    } catch (err) {
      toast({ title: "Media access denied", description: "Please allow media access in your browser settings.", variant: "destructive" });
      if (video) setIsCameraOn(false);
      if (audio) setIsMicOn(false);
      return null;
    }
  }, [setStream, setIsCameraOn, setIsMicOn, eventSettings]);

  const stopStream = (s) => {
    s?.getTracks().forEach(track => track.stop());
  };

  const toggleCamera = useCallback(async () => {
    const willBeOn = !isCameraOn;
    setIsCameraOn(willBeOn);

    if (willBeOn) {
      getMediaStream(true, isMicOn);
    } else {
      setStream(currentStream => {
        if (currentStream) {
          currentStream.getVideoTracks().forEach(t => t.stop());
          if (isMicOn) {
            getMediaStream(false, true);
          }
          return isMicOn ? currentStream : null; 
        }
        return null;
      });
    }
  }, [isCameraOn, isMicOn, getMediaStream, setStream, setIsCameraOn]);

  const toggleMic = useCallback(async () => {
    const willBeOn = !isMicOn;
    setIsMicOn(willBeOn);
    
    setStream(currentStream => {
        if (currentStream) {
            currentStream.getAudioTracks().forEach(t => {
                t.enabled = willBeOn;
            });
        } else if (willBeOn) {
            getMediaStream(isCameraOn, true);
        }
        return currentStream;
    });
  }, [isMicOn, isCameraOn, getMediaStream, setStream, setIsMicOn]);

  const toggleScreenShare = useCallback(async () => {
    if (isSharingScreen) {
      setScreenStream(currentStream => {
        stopStream(currentStream);
        return null;
      });
      setIsSharingScreen(false);
    } else {
      try {
        const s = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        s.getVideoTracks()[0].onended = () => {
          setIsSharingScreen(false); setScreenStream(null);
          if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
        };
        setScreenStream(s);
        setIsSharingScreen(true);
      } catch (err) {
        toast({ title: "Screen share failed", description: "Please grant permission to share your screen.", variant: "destructive" });
      }
    }
  }, [isSharingScreen, setScreenStream, setIsSharingScreen]);

  const handleUploadRecording = async (blob) => {
    setIsUploading(true);
    toast({ title: "Uploading recording...", description: "This may take a moment." });
    const fileName = `${eventId}/${uuidv4()}.webm`;
    const { error: uploadError } = await backendClient.storage
      .from('event_recordings')
      .upload(fileName, blob);

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setIsUploading(false);
      return;
    }

    const { data: { publicUrl } } = backendClient.storage.from('event_recordings').getPublicUrl(fileName);
    
    const { error: dbError } = await backendClient
      .from('events')
      .update({ recording_url: publicUrl })
      .eq('id', eventId);

    if (dbError) {
      toast({ title: "Failed to save recording URL", description: dbError.message, variant: "destructive" });
    } else {
      setRecordingUrl(publicUrl);
      toast({ title: "Recording uploaded!", description: "Download link is now available." });
    }
    setIsUploading(false);
  };

  const toggleRecording = useCallback((streamToRecord) => {
    if (isRecording) {
      try { mediaRecorderRef.current?.stop(); } catch {}
      return;
    }
    if (!streamToRecord) {
      toast({ title: 'Cannot Record', description: 'Please share your screen or turn on camera first.', variant: 'destructive' });
      return;
    }
    try {
      mediaRecorderRef.current = new MediaRecorder(streamToRecord, { mimeType: 'video/webm' });
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        handleUploadRecording(blob);
        recordedChunksRef.current = [];
        setIsRecording(false);
        toast({ title: "Recording stopped" });
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
      toast({ title: "Recording started" });
    } catch (err) {
      toast({ title: "Could not start recording", variant: "destructive" });
    }
  }, [isRecording, eventId]);
  
  const toggleSpeechRecognition = useCallback(() => {
    if (!recognition) return;
    if (isRecognizing) {
      try { recognition.stop(); } catch {}
      setIsRecognizing(false);
      toast({ title: 'Live transcription OFF' });
    } else {
      try {
        recognition.start();
        setIsRecognizing(true);
        toast({ title: 'Live transcription ON' });
      } catch (e) {
        toast({ title: 'Could not start transcription', variant: 'destructive' });
      }
    }
  }, [recognition, isRecognizing]);

  useEffect(() => { isRecognizingRef.current = isRecognizing; }, [isRecognizing]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const r = new SpeechRecognition();
    r.continuous = true;
    r.interimResults = true;
    r.lang = transcriptionLang;
    r.onresult = (e) => setTranscript(Array.from(e.results).map(res => res[0].transcript).join(''));
    r.onerror = (e) => toast({ title: "Speech Recognition Error", description: e.error, variant: 'destructive' });
    r.onend = () => { if (isRecognizingRef.current) { try { r.start(); } catch {} } };
    setRecognition(r);
    return () => { try { r.stop(); } catch {} };
  }, [transcriptionLang]);

  return {
    toggleCamera, toggleMic, toggleScreenShare, toggleRecording, toggleSpeechRecognition,
    isRecording, recordingUrl, isUploading,
    isRecognizing, transcript, transcriptionLang, setTranscriptionLang
  };
};