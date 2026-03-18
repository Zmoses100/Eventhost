import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, BarChart, Settings, Loader2, CreditCard, PlayCircle, Users } from 'lucide-react';
import { useAuth } from '@/context/SupabaseAuthContext';
import { Helmet } from 'react-helmet';
import { backendClient } from '@/lib/backendClient';
import { toast } from '@/components/ui/use-toast';

const OrganizerDashboardPage = () => {
  const { user, profile } = useAuth();
  const [organizedEvents, setOrganizedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      setLoading(true);

      const { data: eventsData, error: eventsError } = await backendClient
        .from('events')
        .select('*')
        .eq('organizer_id', user.id);

      if (eventsError) {
        toast({ title: "Error fetching your events", description: eventsError.message, variant: "destructive" });
      } else {
        setOrganizedEvents(eventsData || []);
        
        if (eventsData && eventsData.length > 0) {
          const eventIds = eventsData.map(event => event.id);
          const { count, error: countError } = await backendClient
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .in('event_id', eventIds)
            .eq('status', 'Pending Confirmation');
          
          if (!countError) {
            setPendingPaymentsCount(count || 0);
          }
        }
      }
      setLoading(false);
    };
    fetchDashboardData();
  }, [user]);

  const handleManageEvent = (event) => {
    navigate(`/host/${event.id}`);
  };

  return (
    <>
      <Helmet>
        <title>Organizer Dashboard - EventHost</title>
        <meta name="description" content="Manage your events, view analytics, and more." />
      </Helmet>
      <div className="text-left mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Organizer Dashboard</h1>
        <p className="text-xl text-white/80">Welcome back, {profile?.name || 'Organizer'}!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <motion.div whileHover={{ y: -5 }}>
          <Card className="glass-effect border-white/20 h-full flex flex-col">
            <CardHeader><CardTitle className="text-white flex items-center gap-2"><PlusCircle /> Create New Event</CardTitle></CardHeader>
            <CardContent className="flex-grow flex flex-col justify-between">
              <CardDescription className="text-white/70 mb-4">Start here to get your next event up and running.</CardDescription>
              <Link to="/create-event"><Button className="w-full bg-white text-purple-600 hover:bg-white/90">Create Event</Button></Link>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -5 }}>
          <Link to="/manage-payments">
            <Card className="glass-effect border-white/20 h-full flex flex-col">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CreditCard /> Manage Payments
                  {pendingPaymentsCount > 0 && (
                    <span className="ml-auto bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-full">
                      {pendingPaymentsCount}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-between">
                <CardDescription className="text-white/70 mb-4">Approve or reject bank transfer payments.</CardDescription>
                <Button asChild className="w-full bg-white/20 text-white hover:bg-white/30 mt-auto"><Link to="/manage-payments">Manage</Link></Button>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
        
        <motion.div whileHover={{ y: -5 }}>
          <Link to="/analytics">
            <Card className="glass-effect border-white/20 h-full flex flex-col">
              <CardHeader><CardTitle className="text-white flex items-center gap-2"><BarChart /> Analytics</CardTitle></CardHeader>
              <CardContent className="flex-grow flex flex-col justify-between">
                <CardDescription className="text-white/70 mb-4">View sales, attendee data, and event analytics.</CardDescription>
                <Button asChild className="w-full bg-white/20 text-white hover:bg-white/30"><Link to="/analytics">View Analytics</Link></Button>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      </div>

      <Card className="glass-effect border-white/20">
        <CardHeader><CardTitle className="text-white">My Events</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>
          ) : organizedEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {organizedEvents.map(event => (
                <Card key={event.id} className="bg-white/5 border-white/10">
                  <CardHeader><CardTitle className="text-white">{event.title}</CardTitle></CardHeader>
                  <CardContent className="flex flex-col flex-grow">
                    <p className="text-white/80">Date: {new Date(event.date).toLocaleDateString()}</p>
                    <p className="text-white/80">Status: <span className={`font-semibold ${event.status === 'Approved' ? 'text-green-400' : 'text-yellow-400'}`}>{event.status}</span></p>
                    <div className="mt-4 flex flex-col space-y-2">
                       <Link to={`/edit-event/${event.id}`}><Button variant="outline" className="w-full bg-white/10 text-white border-white/20 hover:bg-white/20">Edit Event</Button></Link>
                       <Link to={`/host/${event.id}/attendees`}><Button variant="outline" className="w-full bg-white/10 text-white border-white/20 hover:bg-white/20"><Users className="h-4 w-4 mr-2"/>Manage Attendees</Button></Link>
                       <Button onClick={() => handleManageEvent(event)} className="w-full bg-purple-600 hover:bg-purple-700">
                           <PlayCircle className="h-4 w-4 mr-2" />
                           Host Dashboard
                       </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-white/70 text-center py-8">You haven't created any events yet.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default OrganizerDashboardPage;