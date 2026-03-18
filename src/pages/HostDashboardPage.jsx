import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, PlayCircle, Users, BarChart, Settings } from 'lucide-react';
import { Helmet } from 'react-helmet';

const HostDashboardPage = () => {
    const { eventId } = useParams();
    const { user, profile } = useAuth();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchEvent = async () => {
            if (!eventId || !user) return;
            setLoading(true);

            const { data, error } = await supabase
                .from('events')
                .select('*, profiles(name)')
                .eq('id', eventId)
                .single();

            if (error || !data) {
                toast({ title: 'Error fetching event', description: error?.message || 'Event not found.', variant: 'destructive' });
                navigate('/dashboard');
                return;
            }

            setEvent(data);
            setLoading(false);
        };

        fetchEvent();
    }, [eventId, user, navigate]);

    if (loading) {
        return <div className="min-h-screen pt-24 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>;
    }

    if (!event) {
        return null;
    }

    const isOrganizer = profile?.role === 'Event Organizer';

    return (
        <>
            <Helmet>
                <title>Host Dashboard: {event.title}</title>
                <meta name="description" content={`Manage your event: ${event.title}. Access the greenroom, view attendees, and more.`} />
            </Helmet>
            <div className="pt-24 pb-12 px-4 min-h-screen">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="max-w-5xl mx-auto"
                >
                    <div className="mb-8">
                        <Link to="/dashboard" className="inline-flex items-center text-white/80 hover:text-white mb-4">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Dashboard
                        </Link>
                        <h1 className="text-4xl md:text-5xl font-bold text-white">{event.title}</h1>
                        <p className="text-xl text-white/70 mt-2">Host Control Panel</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <motion.div whileHover={{ y: -5 }}>
                            <Card className="glass-effect border-purple-500/50 h-full flex flex-col">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2"><PlayCircle className="text-purple-400" /> Go to Greenroom</CardTitle>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <CardDescription className="text-white/70 mb-4">
                                        Prepare for your virtual event, check your tech, and manage speakers before going live.
                                    </CardDescription>
                                </CardContent>
                                <CardFooter>
                                    <Link to={`/live/${eventId}`} className="w-full">
                                        <Button className="w-full bg-purple-600 hover:bg-purple-700">Enter Greenroom</Button>
                                    </Link>
                                </CardFooter>
                            </Card>
                        </motion.div>

                        {isOrganizer && (
                            <>
                                <motion.div whileHover={{ y: -5 }}>
                                    <Card className="glass-effect border-white/20 h-full flex flex-col">
                                        <CardHeader>
                                            <CardTitle className="text-white flex items-center gap-2"><Users /> Manage Attendees</CardTitle>
                                        </CardHeader>
                                        <CardContent className="flex-grow">
                                            <CardDescription className="text-white/70 mb-4">
                                                View your attendee list, manage tickets, and send communications.
                                            </CardDescription>
                                        </CardContent>
                                        <CardFooter>
                                            <Button variant="outline" className="w-full bg-white/10 text-white border-white/20 hover:bg-white/20" onClick={() => toast({ title: "Feature coming soon!" })}>
                                                View Attendees
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                </motion.div>

                                <motion.div whileHover={{ y: -5 }}>
                                    <Card className="glass-effect border-white/20 h-full flex flex-col">
                                        <CardHeader>
                                            <CardTitle className="text-white flex items-center gap-2"><BarChart /> Event Analytics</CardTitle>
                                        </CardHeader>
                                        <CardContent className="flex-grow">
                                            <CardDescription className="text-white/70 mb-4">
                                                Track sales, engagement, and other key metrics for this event.
                                            </CardDescription>
                                        </CardContent>
                                        <CardFooter>
                                            <Link to="/analytics" className="w-full">
                                                <Button variant="outline" className="w-full bg-white/10 text-white border-white/20 hover:bg-white/20">
                                                    View Analytics
                                                </Button>
                                            </Link>
                                        </CardFooter>
                                    </Card>
                                </motion.div>

                                <motion.div whileHover={{ y: -5 }}>
                                    <Card className="glass-effect border-white/20 h-full flex flex-col">
                                        <CardHeader>
                                            <CardTitle className="text-white flex items-center gap-2"><Settings /> Edit Event Details</CardTitle>
                                        </CardHeader>
                                        <CardContent className="flex-grow">
                                            <CardDescription className="text-white/70 mb-4">
                                                Update event information, pricing, and other settings.
                                            </CardDescription>
                                        </CardContent>
                                        <CardFooter>
                                            <Link to={`/edit-event/${eventId}`} className="w-full">
                                                <Button variant="outline" className="w-full bg-white/10 text-white border-white/20 hover:bg-white/20">
                                                    Edit Event
                                                </Button>
                                            </Link>
                                        </CardFooter>
                                    </Card>
                                </motion.div>
                            </>
                        )}
                    </div>
                </motion.div>
            </div>
        </>
    );
};

export default HostDashboardPage;