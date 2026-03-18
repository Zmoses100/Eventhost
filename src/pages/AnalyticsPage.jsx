import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/SupabaseAuthContext';
import { backendClient } from '@/lib/backendClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Ticket, Users, BarChart, ArrowLeft, Loader2 } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';

const AnalyticsPage = () => {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    ticketsSold: 0,
    totalEvents: 0,
    averageTicketPrice: 0,
  });
  const [topEvents, setTopEvents] = useState([]);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalyticsData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: events, error: eventsError } = await backendClient
      .from('events')
      .select('id')
      .eq('organizer_id', user.id);

    if (eventsError) {
      toast({ title: "Error fetching events", description: eventsError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    if (!events || events.length === 0) {
      setLoading(false);
      return;
    }
    
    const eventIds = events.map(e => e.id);
    const { data: tickets, error: ticketsError } = await backendClient
      .from('tickets')
      .select('*, events(title)')
      .in('event_id', eventIds)
      .in('status', ['Paid', 'Confirmed']);

    if (ticketsError) {
      toast({ title: "Error fetching tickets", description: ticketsError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const totalRevenue = tickets.reduce((sum, ticket) => sum + ticket.price_paid, 0);
    const ticketsSold = tickets.length;
    const averageTicketPrice = ticketsSold > 0 ? totalRevenue / ticketsSold : 0;

    const eventSales = tickets.reduce((acc, ticket) => {
        acc[ticket.event_id] = (acc[ticket.event_id] || 0) + ticket.price_paid;
        return acc;
    }, {});
    
    const sortedEvents = Object.entries(eventSales)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([eventId, revenue]) => {
          const event = tickets.find(t => t.event_id === eventId)?.events;
          return {
              id: eventId,
              title: event?.title || 'Unknown Event',
              revenue
          };
      });

    const { data: attendeeData, error: attendeeError } = await backendClient
      .from('tickets')
      .select('profiles:user_id(id, name), user_id')
      .in('event_id', eventIds)
      .in('status', ['Paid', 'Confirmed']);

    if (attendeeError) {
      toast({ title: "Error fetching attendees", description: attendeeError.message, variant: "destructive" });
    } else if (attendeeData) {
      const userIds = [...new Set(attendeeData.map(a => a.user_id))];
      const { data: usersData, error: usersError } = await backendClient.rpc('get_user_emails', { user_ids: userIds });

      if (usersError) {
        toast({ title: "Error fetching user emails", description: usersError.message, variant: "destructive" });
      } else {
        const emailMap = new Map(usersData.map(u => [u.id, u.email]));
        
        const uniqueAttendees = Array.from(new Set(attendeeData.map(a => a.profiles.id)))
          .map(id => {
            const profileData = attendeeData.find(a => a.profiles.id === id).profiles;
            const userEmail = emailMap.get(id);
            return { ...profileData, email: userEmail };
          }).filter(Boolean); // Filter out any null/undefined entries
        setAttendees(uniqueAttendees);
      }
    }
    
    setStats({
      totalRevenue,
      ticketsSold,
      totalEvents: events.length,
      averageTicketPrice,
    });
    setTopEvents(sortedEvents);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  return (
    <>
      <Helmet>
        <title>Event Analytics - EventHost</title>
        <meta name="description" content="Detailed analytics for your events." />
      </Helmet>
      <div className="pt-20 pb-12 px-4 min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-6xl mx-auto"
        >
          <div className="flex items-center mb-8">
            <Link to="/dashboard">
              <Button variant="ghost" className="text-white hover:bg-white/10 mr-4">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white">Event Analytics</h1>
              <p className="text-xl text-white/80 mt-2">Insights into your event performance.</p>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>
          ) : stats.totalEvents === 0 ? (
             <Card className="glass-effect border-white/20 text-center py-16">
                <CardHeader>
                    <CardTitle className="text-white text-2xl">No Data Yet!</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-white/70 mb-6">It looks like you haven't sold any tickets yet. Once you do, your analytics will appear here.</p>
                    <Link to="/dashboard"><Button className="bg-white text-purple-600 hover:bg-white/90">Back to Dashboard</Button></Link>
                </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6 bg-black/20 border border-white/10">
                <TabsTrigger value="overview"><BarChart className="h-4 w-4 mr-2" />Overview</TabsTrigger>
                <TabsTrigger value="top-events"><Ticket className="h-4 w-4 mr-2" />Top Events</TabsTrigger>
                <TabsTrigger value="attendees"><Users className="h-4 w-4 mr-2" />Attendees</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className="glass-effect border-white/20">
                    <CardHeader><CardTitle className="text-white flex items-center gap-2"><DollarSign /> Total Revenue</CardTitle></CardHeader>
                    <CardContent><p className="text-3xl font-bold text-white">${stats.totalRevenue.toFixed(2)}</p></CardContent>
                  </Card>
                  <Card className="glass-effect border-white/20">
                    <CardHeader><CardTitle className="text-white flex items-center gap-2"><Ticket /> Tickets Sold</CardTitle></CardHeader>
                    <CardContent><p className="text-3xl font-bold text-white">{stats.ticketsSold}</p></CardContent>
                  </Card>
                  <Card className="glass-effect border-white/20">
                    <CardHeader><CardTitle className="text-white flex items-center gap-2"><Users /> Total Events</CardTitle></CardHeader>
                    <CardContent><p className="text-3xl font-bold text-white">{stats.totalEvents}</p></CardContent>
                  </Card>
                  <Card className="glass-effect border-white/20">
                    <CardHeader><CardTitle className="text-white flex items-center gap-2"><DollarSign /> Avg. Ticket Price</CardTitle></CardHeader>
                    <CardContent><p className="text-3xl font-bold text-white">${stats.averageTicketPrice.toFixed(2)}</p></CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="top-events">
                <Card className="glass-effect border-white/20">
                  <CardHeader><CardTitle className="text-white">Top Performing Events</CardTitle><CardDescription className="text-white/70">Based on total revenue generated.</CardDescription></CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {topEvents.map(event => (
                        <div key={event.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                          <p className="font-semibold text-white">{event.title}</p>
                          <p className="text-lg font-bold text-green-400">${event.revenue.toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="attendees">
                <Card className="glass-effect border-white/20">
                  <CardHeader><CardTitle className="text-white">Attendee List</CardTitle><CardDescription className="text-white/70">List of unique attendees across all your events.</CardDescription></CardHeader>
                  <CardContent>
                    <table className="w-full text-white">
                      <thead>
                        <tr className="border-b border-white/20">
                          <th className="text-left p-4 font-medium">Name</th>
                          <th className="text-left p-4 font-medium">Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendees.map(attendee => (
                          <tr key={attendee.id} className="border-b border-white/10 hover:bg-white/5">
                            <td className="p-4">{attendee.name}</td>
                            <td className="p-4">{attendee.email}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </motion.div>
      </div>
    </>
  );
};

export default AnalyticsPage;