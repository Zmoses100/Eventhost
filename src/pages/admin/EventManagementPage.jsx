import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { ArrowLeft, Search, CheckCircle, XCircle, Star, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';

const EventDetailsDialog = ({ event }) => {
  if (!event) return null;
  return (
    <DialogContent className="text-white">
      <DialogHeader>
        <DialogTitle>{event.title}</DialogTitle>
        <DialogDescription>
          Organized by {event.profiles?.name || 'Unknown'} on {new Date(event.date).toLocaleDateString()}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div>
          <h4 className="font-semibold">Description</h4>
          <p className="text-white/80">{event.description}</p>
        </div>
        <div>
          <h4 className="font-semibold">Location</h4>
          <p className="text-white/80">{event.is_virtual ? 'Virtual Event' : event.location}</p>
        </div>
        <div>
          <h4 className="font-semibold">Price</h4>
          <p className="text-white/80">${event.price}</p>
        </div>
        <div>
          <h4 className="font-semibold">Category</h4>
          <p className="text-white/80">{event.category}</p>
        </div>
      </div>
       <DialogFooter>
          <Button variant="outline" asChild>
            <Link to={`/event/${event.id}`}>Go to Event Page</Link>
          </Button>
        </DialogFooter>
    </DialogContent>
  )
}

const AdminEventManagementPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const navigate = useNavigate();

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        profiles ( name )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching events:', error);
      toast({
        title: 'Error Fetching Events',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setEvents(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleEventStatusChange = async (eventId, status) => {
    const { error } = await supabase
      .from('events')
      .update({ status })
      .eq('id', eventId);

    if (error) {
      toast({
        title: 'Error Updating Event',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Event Updated',
        description: `Event has been ${status}.`,
      });
      fetchEvents();
    }
  };

  const toggleFeature = async (event) => {
    const { error } = await supabase
      .from('events')
      .update({ isFeatured: !event.isFeatured })
      .eq('id', event.id);
    
    if (error) {
        toast({ title: 'Error Updating Feature', description: error.message, variant: 'destructive' });
    } else {
        toast({ title: 'Event Updated', description: 'Event feature status has been updated.' });
        fetchEvents();
    }
  };

  const filteredEvents = events.filter(event =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return <Badge className="bg-green-500/80 hover:bg-green-500/70">Approved</Badge>;
      case 'Rejected':
        return <Badge className="bg-red-500/80 hover:bg-red-500/70">Rejected</Badge>;
      case 'Pending':
      default:
        return <Badge className="bg-yellow-500/80 hover:bg-yellow-500/70">Pending</Badge>;
    }
  };

  return (
    <div className="pt-12 pb-12 px-4 min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-6xl mx-auto"
      >
        <div className="flex items-center mb-8">
          <Link to="/super-admin/dashboard">
            <Button variant="ghost" className="text-white hover:bg-white/10 mr-4">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-white">Event Oversight</h1>
        </div>

        <Card className="glass-effect border-white/20">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl text-white">All Events</CardTitle>
            </div>
            <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/60" />
              <Input
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white w-full md:w-1/3"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              {loading ? (
                <p className="text-center text-white/70 py-8">Loading events...</p>
              ) : (
              <table className="w-full text-white">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left p-4 font-medium">Title</th>
                    <th className="text-left p-4 font-medium">Organizer</th>
                    <th className="text-left p-4 font-medium">Date</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map(event => (
                    <tr key={event.id} className="border-b border-white/10 hover:bg-white/5">
                      <td className="p-4">{event.title}</td>
                      <td className="p-4">{event.profiles?.name || 'N/A'}</td>
                      <td className="p-4">{new Date(event.date).toLocaleDateString()}</td>
                      <td className="p-4">
                        {getStatusBadge(event.status)}
                      </td>
                      <td className="p-4 text-right space-x-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-blue-400 hover:text-blue-500" onClick={() => setSelectedEvent(event)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          {selectedEvent?.id === event.id && <EventDetailsDialog event={selectedEvent} />}
                        </Dialog>
                        {event.status === 'Pending' && (
                          <>
                            <Button onClick={() => handleEventStatusChange(event.id, 'Approved')} variant="ghost" size="icon" className="text-green-400 hover:text-green-500">
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button onClick={() => handleEventStatusChange(event.id, 'Rejected')} variant="ghost" size="icon" className="text-red-400 hover:text-red-500">
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button onClick={() => toggleFeature(event)} variant="ghost" size="icon" className={`hover:text-yellow-500 ${event.isFeatured ? 'text-yellow-400' : 'text-white/60'}`}>
                          <Star className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AdminEventManagementPage;