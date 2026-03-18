import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, MapPin, DollarSign, Ticket, Loader2, Share2, Bookmark, Video, Armchair, Tv, Edit, Shield } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Helmet } from 'react-helmet';
import GuestRegistrationDialog from '@/components/Event/GuestRegistrationDialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const TicketSelectionDialog = ({ event, ticketTypes, open, onOpenChange, onSelectTicket }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-effect border-white/20">
        <DialogHeader>
          <DialogTitle className="text-white">Select Your Ticket</DialogTitle>
          <DialogDescription className="text-white/70">Choose a ticket type to proceed to checkout.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {ticketTypes.map(tt => (
            <div key={tt.id} className="p-4 rounded-lg bg-white/10 flex justify-between items-center">
              <div>
                <p className="font-bold text-white">{tt.name}</p>
                <p className="text-white/80">${tt.price.toFixed(2)}</p>
                <p className="text-sm text-white/60">{tt.quantity_available} available</p>
              </div>
              <Button onClick={() => onSelectTicket(tt.id)} className="bg-white text-purple-600 hover:bg-white/90">
                Select
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const EventDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [organizer, setOrganizer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showGuestDialog, setShowGuestDialog] = useState(false);
  const [showTicketSelection, setShowTicketSelection] = useState(false);
  const [userTicket, setUserTicket] = useState(null);

  const fetchEventData = useCallback(async () => {
    setLoading(true);
    
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('*, profiles(*)')
      .eq('id', id)
      .single();

    if (eventError) {
      setError('Failed to load event details.');
      setLoading(false);
      return;
    }
    
    setEvent(eventData);
    setOrganizer(eventData.profiles);

    const { data: ttData, error: ttError } = await supabase
      .from('ticket_types')
      .select('*')
      .eq('event_id', id);

    if (!ttError) {
      setTicketTypes(ttData);
    }
    
    if (user) {
      const { data: ticketData } = await supabase
        .from('tickets')
        .select('*')
        .eq('event_id', id)
        .eq('user_id', user.id)
        .in('status', ['Confirmed'])
        .maybeSingle();
      
      if (ticketData) {
        setUserTicket(ticketData);
      }
    }

    setLoading(false);
  }, [id, user]);

  useEffect(() => {
    fetchEventData();
  }, [fetchEventData]);

  const handleGetTickets = () => {
    if (!user && !event.allow_guest_registration) {
      navigate(`/auth?redirect=/event/${id}`);
      return;
    }

    if (!user && event.allow_guest_registration) {
      setShowGuestDialog(true);
      return;
    }

    if (event.seating_chart_enabled) {
        navigate(`/select-seats/${id}`);
    } else if (ticketTypes.length > 1) {
        setShowTicketSelection(true);
    } else if (ticketTypes.length === 1) {
        navigate(`/checkout/${id}`, { state: { ticketTypeId: ticketTypes[0].id, ticketCount: 1 } });
    } else { // Fallback to original price logic
        navigate(`/checkout/${id}`, { state: { ticketCount: 1 } });
    }
  };
  
  const handleSelectTicketType = (ticketTypeId) => {
    setShowTicketSelection(false);
    navigate(`/checkout/${id}`, { state: { ticketTypeId, ticketCount: 1 } });
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: 'Link Copied!', description: 'Event link copied to your clipboard.' });
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    toast({
      title: isBookmarked ? 'Bookmark Removed' : 'Event Bookmarked!',
      description: `🚧 This feature isn't implemented yet.`,
    });
  };

  const handleManageEvent = () => {
    if (event.is_virtual) {
      navigate(`/live/${id}`);
    } else {
      navigate(`/host/${id}`);
    }
  };

  if (loading) return <div className="min-h-screen pt-24 flex items-center justify-center text-center text-white py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (error) return <div className="text-center text-red-400 py-20">{error}</div>;
  if (!event) return <div className="text-center text-white py-20">Event not found.</div>;

  const isEventOrganizer = user && event.organizer_id === user.id;
  const isEventOver = new Date(event.date).getTime() < new Date().getTime();
  const displayPrice = ticketTypes.length > 0
    ? (ticketTypes.length > 1 ? `From $${Math.min(...ticketTypes.map(t => t.price)).toFixed(2)}` : `$${ticketTypes[0].price.toFixed(2)}`)
    : (event.price > 0 ? `$${event.price.toFixed(2)}` : 'Free');

  return (
    <>
      <Helmet>
        <title>{event.title} - EventHost</title>
        <meta name="description" content={event.description} />
      </Helmet>
      <div className="pt-20 pb-12 min-h-screen">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="h-96 bg-cover bg-center relative"
          style={{ backgroundImage: `url(${event.image_url})` }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
        </motion.div>

        <div className="max-w-5xl mx-auto px-4 -mt-48 relative">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2">
                <Card className="glass-effect border-white/20 overflow-hidden">
                  <CardContent className="p-0">
                    <img className="w-full h-64 object-cover" src={event.image_url} alt={event.title} />
                    <div className="p-6">
                      <h1 className="text-4xl font-bold text-white mb-4">{event.title}</h1>
                      <div className="flex items-center gap-4 mb-4">
                        {event.brand_logo_url && <img src={event.brand_logo_url} alt="Brand Logo" className="h-12 w-12 rounded-full object-contain bg-white/10 p-1" />}
                        <div>
                          <p className="text-lg text-white/90">Organized by <span className="font-bold">{organizer?.name || 'N/A'}</span></p>
                          <p className="text-sm text-white/70">{organizer?.bio || 'The best events in town.'}</p>
                        </div>
                      </div>
                      <div className="border-t border-white/10 pt-4">
                        <h2 className="text-2xl font-bold text-white mb-3">About this Event</h2>
                        <p className="text-white/80 whitespace-pre-wrap">{event.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="md:col-span-1">
                <Card className="glass-effect border-white/20 sticky top-24">
                  <CardHeader>
                    <CardTitle className="text-2xl text-white">Event Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-4">
                      <Calendar className="h-6 w-6 text-purple-300 mt-1" />
                      <div>
                        <p className="font-semibold text-white">Date and Time</p>
                        <p className="text-white/80">{new Date(event.date).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      {event.is_virtual ? <Video className="h-6 w-6 text-purple-300 mt-1" /> : <MapPin className="h-6 w-6 text-purple-300 mt-1" />}
                      <div>
                        <p className="font-semibold text-white">{event.is_virtual ? 'Virtual Event' : 'Location'}</p>
                        <p className="text-white/80">{event.is_virtual ? 'Online' : event.location}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <DollarSign className="h-6 w-6 text-purple-300 mt-1" />
                      <div>
                        <p className="font-semibold text-white">Price</p>
                        <p className="text-white/80">{displayPrice}</p>
                      </div>
                    </div>
                    
                    <div className="border-t border-white/10 pt-4 space-y-3">
                      {isEventOrganizer ? (
                        <div className="space-y-2">
                          <Button className="w-full bg-purple-600 text-white hover:bg-purple-700" onClick={handleManageEvent}>
                            <Shield className="h-5 w-5 mr-2" /> Manage Event
                          </Button>
                          <Button className="w-full bg-white/10 text-white hover:bg-white/20" variant="outline" onClick={() => navigate(`/edit-event/${id}`)}>
                            <Edit className="h-5 w-5 mr-2" /> Edit Event
                          </Button>
                        </div>
                      ) : userTicket && event.is_virtual ? (
                        <Button className="w-full bg-green-500 text-white hover:bg-green-600" onClick={() => navigate(`/live/${id}`)}>
                          <Tv className="h-5 w-5 mr-2" />
                          {isEventOver ? 'View Recording' : 'Join Livestream'}
                        </Button>
                      ) : (
                        <Button className="w-full bg-white text-purple-600 hover:bg-white/90" onClick={handleGetTickets} disabled={isEventOver}>
                          {isEventOver ? "Event Finished" : <Ticket className="h-5 w-5 mr-2" />}
                          {isEventOver ? "Finished" : 'Get Tickets'}
                        </Button>
                      )}
                      <div className="flex gap-2">
                        <Button variant="outline" className="w-full bg-white/10 text-white border-white/20 hover:bg-white/20" onClick={handleShare}>
                          <Share2 className="h-4 w-4 mr-2" /> Share
                        </Button>
                        <Button variant="outline" className="w-full bg-white/10 text-white border-white/20 hover:bg-white/20" onClick={handleBookmark}>
                          <Bookmark className={`h-4 w-4 mr-2 ${isBookmarked ? 'fill-current' : ''}`} /> Bookmark
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      <Dialog open={showGuestDialog} onOpenChange={setShowGuestDialog}>
        <GuestRegistrationDialog event={event} onSuccess={() => { setShowGuestDialog(false); }} />
      </Dialog>
      <TicketSelectionDialog 
        event={event} 
        ticketTypes={ticketTypes}
        open={showTicketSelection} 
        onOpenChange={setShowTicketSelection}
        onSelectTicket={handleSelectTicketType}
      />
    </>
  );
};

export default EventDetailsPage;