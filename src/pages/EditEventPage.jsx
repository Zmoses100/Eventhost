import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { backendClient } from '@/lib/backendClient';
import { useAuth } from '@/context/SupabaseAuthContext';
import { Calendar, MapPin, DollarSign, Image, Save, Video, ArrowLeft, Shield, UserCheck, Loader2, Armchair, Mic, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';

const EditEventPage = () => {
  const { id: eventId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [speakers, setSpeakers] = useState([]);
  const [speakerSearch, setSpeakerSearch] = useState('');
  const [speakerSearchResults, setSpeakerSearchResults] = useState([]);

  const fetchEventData = useCallback(async () => {
    setLoading(true);
    const { data: eventData, error: eventError } = await backendClient
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !eventData) {
      toast({ title: "Event Not Found", variant: "destructive" });
      navigate('/dashboard');
      return;
    }

    if (eventData.organizer_id !== user?.id) {
      toast({ title: "Access Denied", description: "You are not authorized to edit this event.", variant: "destructive" });
      navigate('/dashboard');
      return;
    }
    
    const eventDate = new Date(eventData.date);
    setFormData({
        ...eventData,
        date: eventDate.toISOString().split('T')[0],
        time: eventDate.toTimeString().slice(0, 5),
    });

    const { data: speakerData, error: speakerError } = await backendClient
        .from('speakers')
        .select('profiles:user_id(id, name, profile_picture_url)')
        .eq('event_id', eventId);
    
    if (speakerError) {
        toast({ title: "Failed to load speakers", variant: "destructive", description: speakerError.message });
    } else {
        setSpeakers(speakerData.map(s => s.profiles));
    }


    setLoading(false);
  }, [eventId, user, navigate]);

  useEffect(() => {
    if(user) fetchEventData();
  }, [user, fetchEventData]);


  const categories = ['music', 'technology', 'business', 'sports', 'arts', 'food', 'livestream', 'podcast', 'conference', 'study-group', 'live-shop'];

  const handleInputChange = (field, value) => {
    const newState = { ...formData, [field]: value };
    if (field === 'is_virtual' && value === true) {
        newState.seating_chart_enabled = false;
    }
    if (field === 'seating_chart_enabled' && value === false) {
        newState.seating_rows = '';
        newState.seating_cols = '';
    }
    setFormData(newState);
  };

  const handleSearchSpeakers = async (query) => {
    setSpeakerSearch(query);
    if (query.length < 2) {
      setSpeakerSearchResults([]);
      return;
    }
    const { data, error } = await backendClient
      .from('profiles')
      .select('id, name, profile_picture_url')
      .eq('role', 'Speaker')
      .ilike('name', `%${query}%`)
      .limit(5);

    if (error) {
      toast({ title: "Error searching speakers", description: error.message, variant: "destructive" });
    } else {
      setSpeakerSearchResults(data);
    }
  };

  const handleAddSpeaker = (speaker) => {
    if (!speakers.find(s => s.id === speaker.id)) {
      setSpeakers([...speakers, speaker]);
      setSpeakerSearch('');
      setSpeakerSearchResults([]);
    } else {
      toast({ title: "Speaker already added", variant: "default" });
    }
  };

  const handleRemoveSpeaker = (speakerId) => {
    setSpeakers(speakers.filter(s => s.id !== speakerId));
  };
  
  const handleImageUpload = async (file, bucket, field) => {
      if (!file || !user) return null;
      setSaving(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      
      let filePath;
      if (bucket === 'brand_logos' || bucket === 'profile_pictures') {
        filePath = `${user.id}/${fileName}`;
      } else {
        filePath = fileName;
      }
      
      let { error: uploadError } = await backendClient.storage
          .from(bucket)
          .upload(filePath, file);

      if (uploadError) {
          console.error('Error uploading file:', uploadError);
          toast({ title: "Upload Failed", description: uploadError.message, variant: "destructive" });
          setSaving(false);
          return null;
      }

      const { data } = backendClient.storage
          .from(bucket)
          .getPublicUrl(filePath);

      handleInputChange(field, data.publicUrl);
      setSaving(false);
      return data.publicUrl;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    const eventDateTime = new Date(`${formData.date}T${formData.time}`);

    const updatedEvent = {
        title: formData.title,
        description: formData.description,
        date: eventDateTime.toISOString(),
        location: formData.location,
        category: formData.category,
        price: formData.price ? parseFloat(formData.price) : 0,
        image_url: formData.image_url,
        brand_logo_url: formData.brand_logo_url,
        is_virtual: formData.is_virtual,
        allow_guest_registration: formData.allow_guest_registration,
        seating_chart_enabled: formData.seating_chart_enabled,
        seating_rows: formData.seating_chart_enabled ? parseInt(formData.seating_rows) : null,
        seating_cols: formData.seating_chart_enabled ? parseInt(formData.seating_cols) : null,
    };

    const { error: eventError } = await backendClient
        .from('events')
        .update(updatedEvent)
        .eq('id', eventId);
    
    if (eventError) {
        setSaving(false);
        toast({ title: "Update Failed", description: eventError.message, variant: "destructive" });
        return;
    }

    const { data: existingSpeakers } = await backendClient.from('speakers').select('user_id').eq('event_id', eventId);
    const existingSpeakerIds = existingSpeakers.map(s => s.user_id);
    const newSpeakerIds = speakers.map(s => s.id);

    const speakersToAdd = newSpeakerIds.filter(id => !existingSpeakerIds.includes(id));
    const speakersToRemove = existingSpeakerIds.filter(id => !newSpeakerIds.includes(id));

    if (speakersToAdd.length > 0) {
        const recordsToAdd = speakersToAdd.map(id => ({ event_id: eventId, user_id: id }));
        await backendClient.from('speakers').insert(recordsToAdd);
    }

    if (speakersToRemove.length > 0) {
        await backendClient.from('speakers').delete().eq('event_id', eventId).in('user_id', speakersToRemove);
    }

    setSaving(false);

    toast({ title: "Event Updated Successfully! 🎉", description: "Your changes have been saved." });
    navigate(`/event/${eventId}`);
  };

  if (loading || !formData) {
    return <div className="pt-24 min-h-screen flex items-center justify-center text-white"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="pt-24 pb-12 px-4 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <Link to="/dashboard" className="inline-flex items-center text-white/80 hover:text-white mb-6 transition-colors"><ArrowLeft className="h-4 w-4 mr-2" />Back to Dashboard</Link>
          <div className="text-center mb-8"><h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Edit Your Event</h1><p className="text-xl text-white/80 max-w-2xl mx-auto">Update the details for your event.</p></div>
          <Card className="glass-effect border-white/20">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-8">
                
                <div className="space-y-6">
                  <CardHeader className="p-0"><CardTitle className="text-2xl text-white flex items-center"><Calendar className="h-6 w-6 mr-2" />Event Details</CardTitle></CardHeader>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><Label htmlFor="is_virtual" className="text-white">Event Type *</Label><Select value={String(formData.is_virtual)} onValueChange={(value) => handleInputChange('is_virtual', value === 'true')}><SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue placeholder="Select event type" /></SelectTrigger><SelectContent><SelectItem value="false">Physical Event</SelectItem><SelectItem value="true">Virtual Event</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label htmlFor="category" className="text-white">Category *</Label><Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}><SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent>{categories.map((cat) => (<SelectItem key={cat} value={cat} className="capitalize">{cat.replace('-', ' ')}</SelectItem>))}</SelectContent></Select></div>
                  </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><Label htmlFor="title" className="text-white">Event Title *</Label><Input id="title" placeholder="Enter event title" value={formData.title} onChange={(e) => handleInputChange('title', e.target.value)} className="bg-white/10 border-white/20 text-white placeholder:text-white/60" required /></div>
                    <div className="space-y-2"><Label htmlFor="organizer" className="text-white">Organizer Name</Label><Input id="organizer" placeholder="Your name or organization" value={profile?.name} className="bg-white/10 border-white/20 text-white placeholder:text-white/60" disabled /></div>
                  </div>
                  <div className="space-y-2"><Label htmlFor="image_url" className="text-white flex items-center"><Image className="h-4 w-4 mr-1" />Event Banner Image</Label><Input id="image_url" type="file" onChange={(e) => handleImageUpload(e.target.files[0], 'event_images', 'image_url')} className="bg-white/10 border-white/20 text-white file:text-white/80 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-white/10 hover:file:bg-white/20" accept="image/*" /></div>
                  <div className="space-y-2"><Label htmlFor="brand_logo_url" className="text-white flex items-center"><Image className="h-4 w-4 mr-1" />Brand Logo</Label><Input id="brand_logo_url" type="file" onChange={(e) => handleImageUpload(e.target.files[0], 'brand_logos', 'brand_logo_url')} className="bg-white/10 border-white/20 text-white file:text-white/80 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-white/10 hover:file:bg-white/20" accept="image/*" /></div>
                  <div className="space-y-2"><Label htmlFor="description" className="text-white">Description *</Label><Textarea id="description" placeholder="Describe your event..." value={formData.description} onChange={(e) => handleInputChange('description', e.target.value)} className="bg-white/10 border-white/20 text-white placeholder:text-white/60 min-h-[120px]" required /></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><Label htmlFor="date" className="text-white">Date *</Label><Input id="date" type="date" value={formData.date} onChange={(e) => handleInputChange('date', e.target.value)} className="bg-white/10 border-white/20 text-white" required /></div>
                    <div className="space-y-2"><Label htmlFor="time" className="text-white">Time *</Label><Input id="time" type="time" value={formData.time} onChange={(e) => handleInputChange('time', e.target.value)} className="bg-white/10 border-white/20 text-white" required /></div>
                  </div>
                  {formData.is_virtual ? (
                    <div className="space-y-2"><Label htmlFor="virtualUrl" className="text-white flex items-center"><Video className="h-4 w-4 mr-1" />Virtual Event URL *</Label><Input id="virtualUrl" placeholder="https://..." value={formData.virtualUrl || ''} onChange={(e) => handleInputChange('virtualUrl', e.target.value)} className="bg-white/10 border-white/20 text-white placeholder:text-white/60" required /></div>
                  ) : (
                    <div className="space-y-2"><Label htmlFor="location" className="text-white flex items-center"><MapPin className="h-4 w-4 mr-1" />Location *</Label><Input id="location" placeholder="Event venue or address" value={formData.location} onChange={(e) => handleInputChange('location', e.target.value)} className="bg-white/10 border-white/20 text-white placeholder:text-white/60" required /></div>
                  )}
                </div>

                <div className="space-y-6 border-t border-white/10 pt-8">
                  <CardHeader className="p-0"><CardTitle className="text-2xl text-white flex items-center"><Mic className="h-6 w-6 mr-2" />Speakers</CardTitle></CardHeader>
                  <div className="space-y-2"><Label htmlFor="speaker-search" className="text-white">Add Speakers</Label><Input id="speaker-search" placeholder="Search for speakers by name..." value={speakerSearch} onChange={(e) => handleSearchSpeakers(e.target.value)} className="bg-white/10 border-white/20 text-white placeholder:text-white/60" /></div>
                  {speakerSearchResults.length > 0 && (
                    <ul className="bg-black/20 border border-white/10 rounded-md p-2 space-y-2">
                      {speakerSearchResults.map(speaker => (
                        <li key={speaker.id} className="flex items-center justify-between p-2 hover:bg-white/10 rounded-md">
                          <span className="text-white">{speaker.name}</span>
                          <Button type="button" size="sm" onClick={() => handleAddSpeaker(speaker)}>Add</Button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {speakers.length > 0 && (
                    <div className="space-y-2 pt-4">
                      <h4 className="font-semibold text-white">Added Speakers:</h4>
                      <ul className="space-y-2">
                        {speakers.map(speaker => (
                          <li key={speaker.id} className="flex items-center justify-between p-2 bg-white/5 rounded-md">
                            <span className="text-white">{speaker.name}</span>
                            <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveSpeaker(speaker.id)}><Trash2 className="h-4 w-4 text-red-400" /></Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="space-y-6 border-t border-white/10 pt-8">
                  <CardHeader className="p-0"><CardTitle className="text-2xl text-white flex items-center"><DollarSign className="h-6 w-6 mr-2" />Ticketing</CardTitle></CardHeader>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><Label htmlFor="price" className="text-white">Ticket Price (USD)</Label><Input id="price" type="number" placeholder="0 for free events" value={formData.price} onChange={(e) => handleInputChange('price', e.target.value)} className="bg-white/10 border-white/20 text-white placeholder:text-white/60" min="0" step="0.01" /></div>
                  </div>
                </div>

                {!formData.is_virtual && (
                  <div className="space-y-6 border-t border-white/10 pt-8">
                    <CardHeader className="p-0"><CardTitle className="text-2xl text-white flex items-center"><Armchair className="h-6 w-6 mr-2" />Seating Chart</CardTitle></CardHeader>
                    <div className="flex items-center space-x-2 pt-2">
                      <Switch id="seating_chart_enabled" checked={formData.seating_chart_enabled} onCheckedChange={(c) => handleInputChange('seating_chart_enabled', c)} />
                      <Label htmlFor="seating_chart_enabled" className="text-white flex items-center">Enable Seating Chart</Label>
                    </div>
                    {formData.seating_chart_enabled && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                        <div className="space-y-2"><Label htmlFor="seating_rows" className="text-white">Number of Rows</Label><Input id="seating_rows" type="number" placeholder="e.g., 10" value={formData.seating_rows || ''} onChange={(e) => handleInputChange('seating_rows', e.target.value)} className="bg-white/10 border-white/20 text-white placeholder:text-white/60" min="1" /></div>
                        <div className="space-y-2"><Label htmlFor="seating_cols" className="text-white">Seats per Row</Label><Input id="seating_cols" type="number" placeholder="e.g., 12" value={formData.seating_cols || ''} onChange={(e) => handleInputChange('seating_cols', e.target.value)} className="bg-white/10 border-white/20 text-white placeholder:text-white/60" min="1" /></div>
                      </motion.div>
                    )}
                  </div>
                )}

                <div className="space-y-6 border-t border-white/10 pt-8">
                  <CardHeader className="p-0"><CardTitle className="text-2xl text-white flex items-center"><Shield className="h-6 w-6 mr-2" />Access Control</CardTitle></CardHeader>
                  <div className="flex items-center space-x-2 pt-2">
                    <Switch id="guest_registration" checked={formData.allow_guest_registration} onCheckedChange={(c) => handleInputChange('allow_guest_registration', c)} />
                    <Label htmlFor="guest_registration" className="text-white flex items-center"><UserCheck className="h-4 w-4 mr-2"/>Allow Guest Registration</Label>
                  </div>
                  <p className="text-sm text-white/70">Allow users to register for this event without creating a password-protected account. They will use a magic link sent to their email.</p>
                </div>

                <div className="flex justify-end pt-6 border-t border-white/10"><Button type="submit" className="bg-white text-purple-600 hover:bg-white/90 font-medium px-8 py-3" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button></div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default EditEventPage;