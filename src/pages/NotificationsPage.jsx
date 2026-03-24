import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { backendClient } from '@/lib/backendClient';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Bell, CheckCheck } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Helmet } from 'react-helmet';
import { formatDistanceToNow } from 'date-fns';

const NotificationsPage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await backendClient
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: "Error fetching notifications", description: error.message, variant: "destructive" });
    } else {
      setNotifications(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      const { error } = await backendClient
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification.id);
      
      if (!error) {
        setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
      }
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    const { error } = await backendClient
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds);

    if (error) {
      toast({ title: "Error", description: "Could not mark all as read.", variant: "destructive" });
    } else {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast({ title: "Success", description: "All notifications marked as read." });
    }
  };

  return (
    <>
      <Helmet>
        <title>My Notifications - EventHost</title>
        <meta name="description" content="View all your event notifications and updates." />
      </Helmet>
      <div className="pt-24 pb-12 px-4 min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          <Card className="glass-effect border-white/20">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-6 w-6 text-white" />
                <CardTitle className="text-white text-2xl">Notifications</CardTitle>
              </div>
              <Button variant="outline" size="sm" onClick={markAllAsRead} disabled={notifications.every(n => n.is_read)}>
                <CheckCheck className="h-4 w-4 mr-2" /> Mark all as read
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              ) : notifications.length > 0 ? (
                <div className="space-y-4">
                  {notifications.map(notification => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                      className={`p-4 rounded-lg cursor-pointer transition-colors ${
                        notification.is_read
                          ? 'bg-white/5 hover:bg-white/10'
                          : 'bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400'
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-white">{notification.title}</p>
                          <p className="text-white/80 text-sm mt-1">{notification.message}</p>
                        </div>
                        {!notification.is_read && (
                          <div className="h-2.5 w-2.5 rounded-full bg-purple-400 flex-shrink-0 mt-1 ml-4"></div>
                        )}
                      </div>
                      <p className="text-xs text-white/60 mt-2">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Bell className="h-12 w-12 mx-auto text-white/30" />
                  <p className="mt-4 text-white/70">You have no notifications yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
};

export default NotificationsPage;