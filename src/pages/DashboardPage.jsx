import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/SupabaseAuthContext';
import { backendClient } from '@/lib/backendClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Ticket, Calendar, Heart, Settings, Loader2, Upload, FileCheck, Info, Download, FileImage } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Helmet } from 'react-helmet';
import OrganizerDashboardPage from '@/pages/OrganizerDashboardPage';
import SpeakerDashboardPage from '@/pages/SpeakerDashboardPage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const UploadProofDialog = ({ ticket, onUploadSuccess }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;
    setIsUploading(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `${ticket.id}-${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    let { error: uploadError } = await backendClient.storage
      .from('payment_proofs')
      .upload(filePath, file, { upsert: false });

    if (uploadError) {
      toast({ title: 'Upload Failed', description: uploadError.message, variant: 'destructive' });
      setIsUploading(false);
      return;
    }

    const { data } = backendClient.storage
      .from('payment_proofs')
      .getPublicUrl(filePath);
      
    const { error: updateError } = await backendClient
      .from('tickets')
      .update({ payment_proof_url: data.publicUrl })
      .eq('id', ticket.id);

    if (updateError) {
      toast({ title: 'Update Failed', description: updateError.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success!', description: 'Your proof of payment has been uploaded.' });
      onUploadSuccess();
      setIsOpen(false);
    }
    
    setFile(null);
    if(fileInputRef.current) fileInputRef.current.value = "";
    setIsUploading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button variant="outline" size="sm" className="w-full mt-2 bg-blue-500/20 text-blue-300 border-blue-400 hover:bg-blue-500/30" onClick={() => setIsOpen(true)}>
        <Upload className="h-4 w-4 mr-2" />
        Upload Proof
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Payment Proof</DialogTitle>
          <DialogDescription>
            Upload a screenshot or document of your bank transfer for the event: "{ticket.events.title}".
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="payment-proof" className="text-right text-white/80">
              File
            </Label>
            <Input
              id="payment-proof"
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="col-span-3 bg-white/10 text-white border-white/20 file:text-white"
              accept="image/*,.pdf"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleUpload} disabled={isUploading || !file}>
            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const AttendeeDashboard = ({ user, profile }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'tickets';
  const navigate = useNavigate();

  const fetchTickets = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await backendClient
      .from('tickets')
      .select('*, events(*, profiles(name))')
      .eq('user_id', user.id)
      .order('purchase_date', { ascending: false });

    if (error) {
      toast({ title: "Error fetching tickets", description: error.message, variant: "destructive" });
    } else {
      setTickets(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user?.id) {
      fetchTickets();
    }
  }, [user?.id]);

  const handleTabChange = (value) => {
    setSearchParams({ tab: value });
  };

  if (loading) {
    return <div className="min-h-screen pt-24 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>;
  }
  
  const getStatusInfo = (ticket) => {
    switch (ticket.status) {
      case 'Confirmed':
        return { text: 'Confirmed', color: 'text-green-400' };
      case 'Pending Confirmation':
        return { text: 'Pending Confirmation', color: 'text-yellow-400' };
      case 'Rejected':
        return { text: 'Rejected', color: 'text-red-400' };
      default:
        return { text: ticket.status, color: 'text-white' };
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-6 bg-black/20 border border-white/10">
        <TabsTrigger value="tickets"><Ticket className="h-4 w-4 mr-2" />My Tickets</TabsTrigger>
        <TabsTrigger value="bookmarks"><Heart className="h-4 w-4 mr-2" />Bookmarks</TabsTrigger>
        <TabsTrigger value="settings"><Settings className="h-4 w-4 mr-2" />Account</TabsTrigger>
      </TabsList>

      <TabsContent value="tickets">
        <Card className="glass-effect border-white/20">
          <CardHeader><CardTitle className="text-white">My Tickets</CardTitle></CardHeader>
          <CardContent>
            {tickets.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tickets.map(ticket => {
                  const statusInfo = getStatusInfo(ticket);
                  const showUploadProof = ticket.status === 'Pending Confirmation' && ticket.payment_provider === 'Bank Transfer' && !ticket.payment_proof_url;
                  const isTicketReady = ticket.status === 'Confirmed' && (ticket.download_url_pdf || ticket.download_url_png);

                  return (
                    <Card key={ticket.id} className="bg-white/5 border-white/10 flex flex-col justify-between">
                      <CardHeader><CardTitle className="text-white">{ticket.events.title}</CardTitle></CardHeader>
                      <CardContent>
                        <p className="text-white/80">Date: {new Date(ticket.events.date).toLocaleDateString()}</p>
                        <p className="text-white/80">Location: {ticket.events.location || "Online"}</p>
                        <p className="text-white/80">Status: <span className={`font-semibold ${statusInfo.color}`}>{statusInfo.text}</span></p>

                        {ticket.status === 'Pending Confirmation' && ticket.payment_provider === 'Bank Transfer' && (
                          <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-500/50 rounded-lg text-yellow-200">
                             <Info className="h-4 w-4 inline mr-2" />
                             {ticket.payment_proof_url ? 'Proof submitted. Awaiting approval.' : 'Awaiting payment proof.'}
                          </div>
                        )}
                      </CardContent>
                      <div className="p-6 pt-0 mt-auto">
                        <Link to={`/event/${ticket.events.id}`}><Button variant="outline" className="w-full mt-4 bg-white/10 text-white border-white/20 hover:bg-white/20">View Event</Button></Link>
                         {showUploadProof ? (
                            <UploadProofDialog ticket={ticket} onUploadSuccess={fetchTickets} />
                         ) : ticket.payment_proof_url && ticket.status === 'Pending Confirmation' ? (
                           <Button variant="outline" size="sm" className="w-full mt-2 bg-green-500/20 text-green-300 border-green-400 cursor-not-allowed" disabled>
                             <FileCheck className="h-4 w-4 mr-2" />
                             Proof Uploaded
                           </Button>
                         ) : null}
                         {isTicketReady && (
                            <div className="flex gap-2 mt-2">
                                {ticket.download_url_pdf && (
                                    <a href={ticket.download_url_pdf} target="_blank" rel="noreferrer" className='w-full'>
                                        <Button variant="outline" size="sm" className="w-full bg-red-500/20 text-red-300 border-red-400 hover:bg-red-500/30">
                                            <Download className="h-4 w-4 mr-2" /> PDF
                                        </Button>
                                    </a>
                                )}
                                {ticket.download_url_png && (
                                    <a href={ticket.download_url_png} target="_blank" rel="noreferrer" className='w-full'>
                                        <Button variant="outline" size="sm" className="w-full bg-blue-500/20 text-blue-300 border-blue-400 hover:bg-blue-500/30">
                                            <FileImage className="h-4 w-4 mr-2" /> PNG
                                        </Button>
                                    </a>
                                )}
                            </div>
                         )}
                      </div>
                    </Card>
                  )
                })}
              </div>
            ) : <p className="text-white/70 text-center py-8">You haven't purchased any tickets yet.</p>}
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="bookmarks">
        <Card className="glass-effect border-white/20">
          <CardHeader><CardTitle className="text-white">Bookmarked Events</CardTitle></CardHeader>
          <CardContent><p className="text-white/70 text-center py-8">Feature coming soon!</p></CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="settings">
        <Link to="/profile">
          <Card className="glass-effect border-white/20 hover:border-purple-400 transition-colors">
            <CardHeader><CardTitle className="text-white flex items-center gap-2"><Settings className="h-5 w-5" /> Account Settings</CardTitle></CardHeader>
            <CardContent><p className="text-white/70">Manage your profile, password, and other settings.</p></CardContent>
          </Card>
        </Link>
      </TabsContent>
    </Tabs>
  );
};

const DashboardPage = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || !profile) {
    return <div className="min-h-screen pt-24 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>;
  }

  const renderDashboardByRole = () => {
    switch (profile.role) {
      case 'Event Organizer':
        return <OrganizerDashboardPage />;
      case 'Speaker':
        return <SpeakerDashboardPage />;
      case 'Attendee':
      default:
        return <AttendeeDashboard user={user} profile={profile} />;
    }
  };

  return (
    <>
      <Helmet>
        <title>My Dashboard - Your Event Hub</title>
        <meta name="description" content="Manage your tickets, upcoming events, and account settings all in one place." />
      </Helmet>
      <div className="pt-20 pb-12 px-4 min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-6xl mx-auto"
        >
          {profile.role !== 'Event Organizer' && profile.role !== 'Speaker' && (
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-white">Welcome, {profile?.name || user?.email}</h1>
                <p className="text-xl text-white/80 mt-2">Your personal event hub.</p>
              </div>
            </div>
          )}
          {renderDashboardByRole()}
        </motion.div>
      </div>
    </>
  );
};

export default DashboardPage;