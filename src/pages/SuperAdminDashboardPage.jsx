import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Calendar, Settings, BarChart, LogOut, PlusCircle, UserPlus, Activity, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/customSupabaseClient';

const SuperAdminDashboardPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ events: 0, users: 0, sales: 0 });
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      const { data: usersData, count: usersCount, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: eventsData, count: eventsCount, error: eventsError } = await supabase
        .from('events')
        .select('id, title, status, created_at, profiles(name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select('price_paid');

      if (usersError || eventsError || ticketsError) {
        toast({ title: "Error fetching data", description: "Could not load dashboard stats.", variant: "destructive" });
        if (usersError) console.error('Users error:', usersError);
        if (eventsError) console.error('Events error:', eventsError);
      } else {
        const totalSales = ticketsData.reduce((acc, ticket) => acc + (ticket.price_paid || 0), 0);
        setStats({
          events: eventsCount || 0,
          users: usersCount || 0,
          sales: totalSales,
        });
        setRecentUsers(usersData || []);
        setRecentEvents(eventsData || []);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: 'Logged Out',
      description: 'You have been successfully logged out.',
    });
    navigate('/super-admin/login');
  };

  return (
    <div className="pt-12 pb-12 px-4 min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-7xl mx-auto"
      >
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Super Admin Dashboard</h1>
            <p className="text-xl text-white/80">Platform Overview & Management</p>
          </div>
          <Button onClick={handleLogout} variant="destructive">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="glass-effect border-white/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white/80">Total Events</CardTitle>
                <Calendar className="h-4 w-4 text-white/60" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.events}</div>
              </CardContent>
            </Card>
            <Card className="glass-effect border-white/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white/80">Total Users</CardTitle>
                <Users className="h-4 w-4 text-white/60" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.users}</div>
              </CardContent>
            </Card>
            <Card className="glass-effect border-white/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white/80">Total Sales</CardTitle>
                <BarChart className="h-4 w-4 text-white/60" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">${stats.sales.toLocaleString()}</div>
                <p className="text-xs text-white/60">(From all ticket sales)</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-white mb-4">Management Tools</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="glass-effect border-white/20 hover:border-purple-400 transition-colors">
                <CardHeader><CardTitle className="text-white flex items-center gap-2"><Users className="h-5 w-5" /> User Management</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-white/70 mb-4">View, edit, and manage all user accounts.</p>
                  <Link to="/super-admin/users"><Button className="w-full bg-white text-purple-600 hover:bg-white/90">Manage Users</Button></Link>
                </CardContent>
              </Card>
              <Card className="glass-effect border-white/20 hover:border-purple-400 transition-colors">
                <CardHeader><CardTitle className="text-white flex items-center gap-2"><Calendar className="h-5 w-5" /> Event Oversight</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-white/70 mb-4">Monitor, feature, or remove events.</p>
                  <Link to="/super-admin/events"><Button className="w-full bg-white text-purple-600 hover:bg-white/90">Manage Events</Button></Link>
                </CardContent>
              </Card>
              <Card className="glass-effect border-white/20 hover:border-purple-400 transition-colors">
                <CardHeader><CardTitle className="text-white flex items-center gap-2"><Settings className="h-5 w-5" /> Platform Settings</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-white/70 mb-4">Configure global settings and integrations.</p>
                  <Link to="/super-admin/settings"><Button className="w-full bg-white text-purple-600 hover:bg-white/90">Configure Settings</Button></Link>
                </CardContent>
              </Card>
              <Card className="glass-effect border-white/20 hover:border-purple-400 transition-colors">
                <CardHeader><CardTitle className="text-white flex items-center gap-2"><Activity className="h-5 w-5" /> Quick Actions</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Link to="/super-admin/users"><Button variant="outline" className="w-full bg-white/10 text-white border-white/20 hover:bg-white/20"><UserPlus className="h-4 w-4 mr-2" /> Create User</Button></Link>
                  <Link to="/create-event"><Button variant="outline" className="w-full bg-white/10 text-white border-white/20 hover:bg-white/20"><PlusCircle className="h-4 w-4 mr-2" /> Create Event</Button></Link>
                </CardContent>
              </Card>
            </div>
          </div>
          <div className="space-y-8">
            <Card className="glass-effect border-white/20">
              <CardHeader><CardTitle className="text-white">Recent Registrations</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {recentUsers.length > 0 ? recentUsers.map(user => (
                  <div key={user.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9"><AvatarImage src={user.profile_picture_url} /><AvatarFallback>{user.name ? user.name.charAt(0) : 'U'}</AvatarFallback></Avatar>
                      <div><p className="font-medium text-white">{user.name}</p><p className="text-xs text-white/60">{user.role}</p></div>
                    </div>
                    <Badge variant={user.status === 'Active' ? 'default' : 'secondary'} className={user.status === 'Active' ? 'bg-green-500/80' : 'bg-gray-500/80'}>{user.status}</Badge>
                  </div>
                )) : <p className="text-white/70 text-center">No recent user registrations.</p>}
              </CardContent>
            </Card>
            <Card className="glass-effect border-white/20">
              <CardHeader><CardTitle className="text-white">Recent Events</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {recentEvents.length > 0 ? recentEvents.map(event => (
                  <div key={event.id} className="flex items-center justify-between">
                    <div><p className="font-medium text-white">{event.title}</p><p className="text-xs text-white/60">by {event.profiles?.name || 'N/A'}</p></div>
                    <Badge className={event.status === 'Approved' ? 'bg-green-500/80' : event.status === 'Rejected' ? 'bg-red-500/80' : 'bg-yellow-500/80'}>{event.status}</Badge>
                  </div>
                )) : <p className="text-white/70 text-center">No recent event submissions.</p>}
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SuperAdminDashboardPage;