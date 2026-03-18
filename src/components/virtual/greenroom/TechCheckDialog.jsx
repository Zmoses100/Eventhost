import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useMediaControls } from '@/hooks/useMediaControls';
import { Video, Mic, Volume2, Wifi, X, Check } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const TechCheckDialog = ({ open, onOpenChange }) => {
  const [stream, setStream] = useState(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const videoRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const animationFrameIdRef = useRef(null);
  const [micLevel, setMicLevel] = useState(0);
  const [networkSpeed, setNetworkSpeed] = useState(null);
  const [testingNetwork, setTestingNetwork] = useState(false);

  const { toggleCamera, toggleMic } = useMediaControls(setStream, null, isCameraOn, setIsCameraOn, isMicOn, setIsMicOn, false, () => {});

  useEffect(() => {
    if (open) {
      toggleCamera(true);
      toggleMic(true);
    } else {
      stream?.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsCameraOn(false);
      setIsMicOn(false);
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    }
    return () => {
      stream?.getTracks().forEach(track => track.stop());
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [open]);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
    if (stream && isMicOn && stream.getAudioTracks().length > 0) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);

      const draw = () => {
        animationFrameIdRef.current = requestAnimationFrame(draw);
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        const avg = dataArrayRef.current.reduce((a, b) => a + b, 0) / bufferLength;
        setMicLevel(avg / 2);
      };
      draw();
    } else {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      setMicLevel(0);
    }
  }, [stream, isMicOn]);

  const testNetworkSpeed = () => {
    setTestingNetwork(true);
    setNetworkSpeed(null);
    const imageAddr = "https://images.unsplash.com/photo-1518770660439-4636190af475?w=100";
    const downloadSize = 499537; //bytes
    let startTime, endTime;
    const download = new Image();
    download.onload = () => {
        endTime = (new Date()).getTime();
        const duration = (endTime - startTime) / 1000;
        const bitsLoaded = downloadSize * 8;
        const speedBps = (bitsLoaded / duration).toFixed(2);
        const speedKbps = (speedBps / 1024).toFixed(2);
        const speedMbps = (speedKbps / 1024).toFixed(2);
        setNetworkSpeed(speedMbps);
        setTestingNetwork(false);
        toast({ title: "Network test complete!", description: `Speed: ${speedMbps} Mbps` });
    }
    download.onerror = () => {
        setTestingNetwork(false);
        toast({ title: "Network test failed", variant: "destructive" });
    }
    startTime = (new Date()).getTime();
    download.src = imageAddr + "&t=" + startTime;
  };

  const StatusIcon = ({ status }) => status ? <Check className="h-5 w-5 text-green-500" /> : <X className="h-5 w-5 text-red-500" />;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-effect max-w-2xl">
        <DialogHeader><DialogTitle className="text-white">Tech Check</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          <div>
            <h3 className="font-semibold text-white mb-2">Camera Preview</h3>
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <video ref={videoRef} autoPlay muted className="w-full h-full object-cover"></video>
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="font-semibold text-white">System Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 bg-white/5 rounded">
                <div className="flex items-center gap-2 text-white"><Video className="h-5 w-5" /> Camera</div>
                <StatusIcon status={isCameraOn} />
              </div>
              <div className="flex items-center justify-between p-2 bg-white/5 rounded">
                <div className="flex items-center gap-2 text-white"><Mic className="h-5 w-5" /> Microphone</div>
                <StatusIcon status={isMicOn} />
              </div>
              {isMicOn && (
                <div className="flex items-center gap-2 p-2 bg-white/5 rounded">
                  <Volume2 className="h-5 w-5 text-white" />
                  <div className="w-full bg-gray-600 rounded-full h-2.5">
                    <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${micLevel}%` }}></div>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between p-2 bg-white/5 rounded">
                <div className="flex items-center gap-2 text-white"><Wifi className="h-5 w-5" /> Network</div>
                {networkSpeed ? <span className="text-green-400">{networkSpeed} Mbps</span> : <Button size="sm" onClick={testNetworkSpeed} disabled={testingNetwork}>{testingNetwork ? 'Testing...' : 'Test'}</Button>}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TechCheckDialog;