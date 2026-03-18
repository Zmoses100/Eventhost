import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { Shield, Video, Users, Image as ImageIcon, Zap, Bookmark, HeartHandshake as Handshake, Settings, FileQuestion, StopCircle } from 'lucide-react';
import TechCheckDialog from '@/components/virtual/greenroom/TechCheckDialog.jsx';
import ManageSpeakersDialog from '@/components/virtual/greenroom/ManageSpeakersDialog.jsx';
import ManageSponsorsDialog from '@/components/virtual/greenroom/ManageSponsorsDialog.jsx';
import AddChapterDialog from '@/components/virtual/greenroom/AddChapterDialog.jsx';
import EventSettingsDialog from '@/components/virtual/greenroom/EventSettingsDialog.jsx';
import RaisedHandsPanel from '@/components/virtual/greenroom/RaisedHandsPanel';

const Greenroom = ({ onGoLive, onStopLive, event, onSceneChange, onLowerThirdChange, onInviteSpeaker, onRemoveSpeaker, onAddChapter, onUpdateEventSettings, isLive, raisedHands, onLowerHand }) => {
  const [isTechCheckOpen, setIsTechCheckOpen] = useState(false);
  const [isManageSpeakersOpen, setIsManageSpeakersOpen] = useState(false);
  const [isManageSponsorsOpen, setIsManageSponsorsOpen] = useState(false);
  const [isAddChapterOpen, setIsAddChapterOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [lowerThirdText, setLowerThirdText] = useState('');
  const [lowerThirdImage, setLowerThirdImage] = useState(null);
  const imageInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLowerThirdImage(reader.result);
        toast({ title: "Image uploaded", description: "Ready to be shown on screen." });
      };
      reader.readAsDataURL(file);
    }
  };

  const showLowerThird = () => {
    onLowerThirdChange({ text: lowerThirdText, image: lowerThirdImage, show: true });
    toast({ title: "Lower-third is now live." });
  };
  
  const hideLowerThird = () => {
    onLowerThirdChange({ text: lowerThirdText, image: lowerThirdImage, show: false });
    toast({ title: "Lower-third is hidden." });
  };
  
  const handleLiveButtonClick = () => {
    if (isLive) {
      onStopLive();
    } else {
      onGoLive();
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="glass-effect border-white/20 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Shield className="h-6 w-6 mr-3 text-green-400" />
              Greenroom Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Button onClick={() => setIsTechCheckOpen(true)} variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                <Video className="h-4 w-4 mr-2" /> Tech Check
              </Button>
              <Button onClick={() => setIsManageSpeakersOpen(true)} variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                <Users className="h-4 w-4 mr-2" /> Speakers
              </Button>
              <Button onClick={() => setIsManageSponsorsOpen(true)} variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                <Handshake className="h-4 w-4 mr-2" /> Sponsors
              </Button>
              <Button onClick={() => setIsAddChapterOpen(true)} variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                <Bookmark className="h-4 w-4 mr-2" /> Chapter
              </Button>
              <Button onClick={() => setIsSettingsOpen(true)} variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                <Settings className="h-4 w-4 mr-2" /> Settings
              </Button>
            </div>
            <div>
              <Label className="text-white">Scene Control</Label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-2">
                <Button size="sm" onClick={() => onSceneChange('welcome')} variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">Welcome</Button>
                <Button size="sm" onClick={() => onSceneChange('main-talk')} variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">Main Talk</Button>
                <Button size="sm" onClick={() => onSceneChange('q&a')} variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">Q&A</Button>
                <Button size="sm" onClick={() => onSceneChange('survey')} variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                  <FileQuestion className="h-4 w-4 mr-2" /> Survey
                </Button>
                <Button size="sm" onClick={() => onSceneChange('ending')} variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">Ending</Button>
              </div>
            </div>
            <div>
              <Label htmlFor="lowerThird" className="text-white">Lower-Third / Sponsor Bug</Label>
              <div className="flex gap-2 mt-2">
                <Input id="lowerThird" value={lowerThirdText} onChange={(e) => setLowerThirdText(e.target.value)} placeholder="Sponsor Name / Lower Third Text" className="bg-white/10 border-white/20 text-white placeholder:text-white/60" />
                <input type="file" accept="image/png, image/jpeg, image/svg+xml" ref={imageInputRef} onChange={handleImageUpload} className="hidden" />
                <Button onClick={() => imageInputRef.current.click()}><ImageIcon className="h-4 w-4" /></Button>
                <Button onClick={showLowerThird}>Show</Button>
                <Button onClick={hideLowerThird} variant="secondary">Hide</Button>
              </div>
              {lowerThirdImage && <img  src={lowerThirdImage} alt="Sponsor logo preview" className="w-16 h-16 mt-2 object-contain bg-white/10 rounded-md p-1" src="https://images.unsplash.com/photo-1495141140011-c78f856df608" />}
            </div>
            <div className="text-center border-t border-white/10 pt-4 space-y-2">
               <Button onClick={handleLiveButtonClick} size="lg" className={`w-full font-bold text-white ${isLive ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-600 hover:bg-red-700'}`}>
                  {isLive ? <StopCircle className="h-4 w-4 mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                  {isLive ? 'Stop Live' : 'Go Live'}
               </Button>
            </div>
          </CardContent>
        </Card>
        <RaisedHandsPanel raisedHands={raisedHands} onLowerHand={onLowerHand} />
      </div>
      <TechCheckDialog open={isTechCheckOpen} onOpenChange={setIsTechCheckOpen} />
      <ManageSpeakersDialog open={isManageSpeakersOpen} onOpenChange={setIsManageSpeakersOpen} event={event} onInviteSpeaker={onInviteSpeaker} onRemoveSpeaker={onRemoveSpeaker} />
      <ManageSponsorsDialog open={isManageSponsorsOpen} onOpenChange={setIsManageSponsorsOpen} event={event} />
      <AddChapterDialog open={isAddChapterOpen} onOpenChange={setIsAddChapterOpen} onAddChapter={(title) => { onAddChapter(title); setIsAddChapterOpen(false); }} />
      <EventSettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} event={event} onSave={onUpdateEventSettings} />
    </>
  );
};

export default Greenroom;