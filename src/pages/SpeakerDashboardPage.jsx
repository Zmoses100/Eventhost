import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, User, Loader2, PlayCircle } from 'lucide-react';
import { useAuth } from '@/context/SupabaseAuthContext';
import { Helmet } from 'react-helmet';
import { backendClient } from '@/lib/backendClient';
import { toast } from '@/components/ui/use-toast';

const SpeakerDashboardPage = () => {
    const { user, profile } = useAuth();
    const [engagements, setEngagements] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchEngagements = async () => {
            if (!user) return;
            setLoading(true);

            const { data, error } = await backendClient
                .from('speakers')
                .select('events!speakers_event_id_fkey(*, profiles(name))')
                .eq('user_id', user.id);

            if (error) {
                toast({
                    title: "Error fetching engagements",
                    description: error.message,
                    variant: "destructive",
                });
            } else {
                setEngagements(data.map(item => item.events).filter(Boolean));
            }
            setLoading(false);
        };

        fetchEngagements();
    }, [user]);

    const handleJoinEvent = (eventId) => {
        navigate(`/host/${eventId}`);
    };

    return (
        <>
            <Helmet>
                <title>Speaker Dashboard - EventHost</title>
                <meta name="description" content="View your upcoming speaking engagements and manage your profile." />
            </Helmet>
            <div className="text-left mb-8">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Speaker Dashboard</h1>
                <p className="text-xl text-white/80">Welcome, {profile?.name || 'Speaker'}!</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="glass-effect border-white/20 md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2"><Calendar /> Upcoming Speaking Engagements</CardTitle>
                        <CardDescription className="text-white/70">Here are the events you are scheduled to speak at.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {loading ? (
                            <div className="flex justify-center items-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-white" />
                            </div>
                        ) : engagements.length > 0 ? engagements.map(event => (
                            <div key={event.id} className="p-4 bg-white/5 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div className="flex-grow">
                                    <h3 className="font-bold text-white">{event.title}</h3>
                                    <p className="text-sm text-white/70">{new Date(event.date).toLocaleDateString()}</p>
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <Link to={`/event/${event.id}`} className="flex-1">
                                        <Button variant="outline" className="w-full bg-white/10 text-white border-white/20 hover:bg-white/20">View Event</Button>
                                    </Link>
                                    {event.is_virtual && (
                                        <Button onClick={() => handleJoinEvent(event.id)} className="flex-1 bg-purple-600 hover:bg-purple-700">
                                            <PlayCircle className="h-4 w-4 mr-2" />
                                            Go to Greenroom
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )) : (
                            <p className="text-center text-white/70 py-4">You have no upcoming speaking engagements.</p>
                        )}
                    </CardContent>
                </Card>

                 <motion.div whileHover={{ y: -5 }}>
                    <Link to="/profile">
                        <Card className="glass-effect border-white/20 h-full flex flex-col">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2"><User /> Manage Your Profile</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-grow flex flex-col justify-between">
                                <CardDescription className="text-white/70 mb-4">Keep your bio, photo, and social links up-to-date for event organizers.</CardDescription>
                                <Button className="w-full bg-white text-purple-600 hover:bg-white/90 mt-auto">Edit Profile</Button>
                            </CardContent>
                        </Card>
                    </Link>
                </motion.div>
                
            </div>
        </>
    );
};

export default SpeakerDashboardPage;