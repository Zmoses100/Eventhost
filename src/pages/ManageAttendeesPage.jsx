import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { backendClient } from '@/lib/backendClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft, Ticket, Send, PlusCircle, Trash2, UploadCloud, Image as ImageIcon } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/SupabaseAuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

const ManageTicketStyle = ({ event, onUpdate }) => {
    const { user } = useAuth();
    const [uploading, setUploading] = useState(false);
    const [ticketStyleUrl, setTicketStyleUrl] = useState(event.ticket_style_url);
    const fileInputRef = useRef(null);

    const handleFileSelect = () => {
        fileInputRef.current.click();
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${event.id}/${fileName}`;

        const { error: uploadError } = await backendClient.storage
            .from('ticket_styles')
            .upload(filePath, file, { upsert: true });

        if (uploadError) {
            toast({ title: "Upload Failed", description: uploadError.message, variant: "destructive" });
            setUploading(false);
            return;
        }

        const { data: { publicUrl } } = backendClient.storage
            .from('ticket_styles')
            .getPublicUrl(filePath);

        const { error: dbError } = await backendClient
            .from('events')
            .update({ ticket_style_url: publicUrl })
            .eq('id', event.id);

        if (dbError) {
            toast({ title: "Update Failed", description: dbError.message, variant: "destructive" });
        } else {
            setTicketStyleUrl(publicUrl);
            onUpdate({ ...event, ticket_style_url: publicUrl });
            toast({ title: "Success!", description: "Ticket style has been updated." });
        }
        setUploading(false);
    };

    return (
        <Card className="glass-effect border-white/20">
            <CardHeader>
                <CardTitle className="text-white">Custom Ticket Design</CardTitle>
                <CardDescription>Upload a background image for your tickets. Recommended size: 1200x628px.</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
                <div className="w-full aspect-video bg-black/20 rounded-lg flex items-center justify-center border-2 border-dashed border-white/20 mb-4">
                    {ticketStyleUrl ? (
                        <img src={ticketStyleUrl} alt="Ticket style preview" className="w-full h-full object-contain rounded-lg" />
                    ) : (
                        <div className="text-white/50 flex flex-col items-center">
                            <ImageIcon className="h-12 w-12 mb-2" />
                            <p>No custom style uploaded.</p>
                        </div>
                    )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept="image/png, image/jpeg" />
                <Button onClick={handleFileSelect} disabled={uploading}>
                    {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                    {uploading ? "Uploading..." : "Upload New Design"}
                </Button>
            </CardContent>
        </Card>
    );
};

const ManageTicketTypes = ({ eventId, ticketTypes, fetchTicketTypes }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newTicketType, setNewTicketType] = useState({ name: '', price: 0, quantity_available: 100 });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTicketType(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveTicketType = async () => {
    setIsSaving(true);
    const { error } = await backendClient.from('ticket_types').insert({
      event_id: eventId,
      ...newTicketType,
      price: parseFloat(newTicketType.price)
    });
    if (error) {
      toast({ title: 'Error saving ticket type', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Ticket Type Saved!' });
      fetchTicketTypes();
      setIsDialogOpen(false);
      setNewTicketType({ name: '', price: 0, quantity_available: 100 });
    }
    setIsSaving(false);
  };
  
  const handleDelete = async (id) => {
    const { error } = await backendClient.from('ticket_types').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error deleting ticket type', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Ticket Type Deleted' });
      fetchTicketTypes();
    }
  }

  return (
    <Card className="glass-effect border-white/20">
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle className="text-white">Manage Ticket Types</CardTitle>
                <CardDescription>Create and manage different ticket categories for your event.</CardDescription>
            </div>
            <Button onClick={() => setIsDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4"/>Add Ticket Type</Button>
        </div>
      </CardHeader>
      <CardContent>
        {ticketTypes.length > 0 ? (
          <div className="space-y-4">
            {ticketTypes.map(tt => (
              <div key={tt.id} className="p-4 rounded-lg bg-white/10 flex justify-between items-center">
                <div>
                  <p className="font-bold text-white">{tt.name}</p>
                  <p className="text-white/80">${tt.price.toFixed(2)} - {tt.quantity_available} available</p>
                </div>
                <Button size="icon" variant="destructive" onClick={() => handleDelete(tt.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-white/70 py-4">No ticket types created yet.</p>
        )}
      </CardContent>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-effect border-white/20">
          <DialogHeader>
            <DialogTitle className="text-white">Add New Ticket Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name" className="text-white">Ticket Name</Label>
              <Input id="name" name="name" value={newTicketType.name} onChange={handleInputChange} placeholder="e.g., VIP, General Admission" className="mt-1 bg-white/10 text-white border-white/20"/>
            </div>
            <div>
              <Label htmlFor="price" className="text-white">Price ($)</Label>
              <Input id="price" name="price" type="number" value={newTicketType.price} onChange={handleInputChange} className="mt-1 bg-white/10 text-white border-white/20"/>
            </div>
            <div>
              <Label htmlFor="quantity_available" className="text-white">Quantity Available</Label>
              <Input id="quantity_available" name="quantity_available" type="number" value={newTicketType.quantity_available} onChange={handleInputChange} className="mt-1 bg-white/10 text-white border-white/20"/>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSaveTicketType} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Save Ticket Type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

const ManageCommunications = ({ eventId, communications, fetchCommunications }) => {
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    const handleSendCommunication = async (e) => {
        e.preventDefault();
        setIsSending(true);

        const { data, error } = await backendClient.functions.invoke('send-communication-email', {
            body: { event_id: eventId, subject, message },
        });

        if (error) {
            toast({ title: 'Error sending email', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Email Sent!', description: data.message });
            fetchCommunications();
            setSubject('');
            setMessage('');
        }
        setIsSending(false);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="glass-effect border-white/20">
                <CardHeader>
                    <CardTitle className="text-white">Send New Communication</CardTitle>
                    <CardDescription>Email all confirmed attendees for this event.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSendCommunication} className="space-y-4">
                        <div>
                            <Label htmlFor="subject" className="text-white">Subject</Label>
                            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required className="mt-1 bg-white/10 text-white border-white/20"/>
                        </div>
                        <div>
                            <Label htmlFor="message" className="text-white">Message</Label>
                            <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} required placeholder="Write your update here... HTML is supported." className="mt-1 min-h-[150px] bg-white/10 text-white border-white/20"/>
                        </div>
                        <Button type="submit" className="w-full" disabled={isSending}>
                            {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                            Send to Attendees
                        </Button>
                    </form>
                </CardContent>
            </Card>
            <Card className="glass-effect border-white/20">
                <CardHeader>
                    <CardTitle className="text-white">Sent Communications</CardTitle>
                    <CardDescription>A history of emails sent for this event.</CardDescription>
                </CardHeader>
                <CardContent>
                    {communications.length > 0 ? (
                        <div className="space-y-4">
                        {communications.map(comm => (
                            <div key={comm.id} className="p-3 rounded-lg bg-white/10">
                                <p className="font-bold text-white">{comm.subject}</p>
                                <p className="text-sm text-white/70">Sent on: {new Date(comm.sent_at).toLocaleString()}</p>
                            </div>
                        ))}
                        </div>
                    ) : (
                        <p className="text-center text-white/70 py-4">No communications sent yet.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

const ManageAttendeesPage = () => {
  const { eventId } = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [communications, setCommunications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user || !eventId) return;
    setLoading(true);

    const { data: eventData, error: eventError } = await backendClient.from('events').select('*').eq('id', eventId).single();
    if (eventError || !eventData || eventData.organizer_id !== user.id) {
        toast({ title: "Access Denied", description: "You are not the organizer of this event.", variant: "destructive" });
        setLoading(false);
        return;
    }
    setEvent(eventData);

    await Promise.all([
      fetchTicketTypes(),
      fetchCommunications(),
    ]);

    setLoading(false);
  }, [user, eventId]);

  const fetchTicketTypes = async () => {
    const { data, error } = await backendClient.from('ticket_types').select('*').eq('event_id', eventId).order('created_at');
    if (!error) setTicketTypes(data);
  };
  
  const fetchCommunications = async () => {
    const { data, error } = await backendClient.from('communications').select('*').eq('event_id', eventId).order('sent_at', { ascending: false });
    if (!error) setCommunications(data);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <div className="min-h-screen pt-24 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>;
  }
  
  if (!event) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center text-center">
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Event not found or access denied.</h2>
          <Link to="/dashboard">
            <Button className="bg-white text-purple-600 hover:bg-white/90">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Manage Attendees - {event?.title}</title>
        <meta name="description" content={`Manage tickets and communications for ${event?.title}.`} />
      </Helmet>
      <div className="pt-20 pb-12 px-4 min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-6xl mx-auto"
        >
          <Link to={`/dashboard`} className="inline-flex items-center text-white/80 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          <div className="text-left mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Manage Attendees</h1>
            <p className="text-xl text-white/80">{event.title}</p>
          </div>
          
          <Tabs defaultValue="tickets" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-black/20 border border-white/10">
              <TabsTrigger value="tickets"><Ticket className="h-4 w-4 mr-2" />Ticket Types</TabsTrigger>
              <TabsTrigger value="design"><ImageIcon className="h-4 w-4 mr-2" />Ticket Design</TabsTrigger>
              <TabsTrigger value="communications"><Send className="h-4 w-4 mr-2" />Communications</TabsTrigger>
            </TabsList>
            <TabsContent value="tickets">
                <ManageTicketTypes eventId={eventId} ticketTypes={ticketTypes} fetchTicketTypes={fetchTicketTypes} />
            </TabsContent>
            <TabsContent value="design">
                <ManageTicketStyle event={event} onUpdate={setEvent} />
            </TabsContent>
            <TabsContent value="communications">
                <ManageCommunications eventId={eventId} communications={communications} fetchCommunications={fetchCommunications} />
            </TabsContent>
          </Tabs>

        </motion.div>
      </div>
    </>
  );
};

export default ManageAttendeesPage;