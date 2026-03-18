import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Helmet } from 'react-helmet';
import { Badge } from '@/components/ui/badge';

const PaymentManagementPage = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingTicketId, setUpdatingTicketId] = useState(null);

  const fetchTickets = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: eventsData, error: eventsError } = await supabase
      .from('events')
      .select('id')
      .eq('organizer_id', user.id);

    if (eventsError) {
      toast({ title: "Error fetching your events", description: eventsError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const eventIds = eventsData.map(event => event.id);

    if (eventIds.length === 0) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('tickets')
      .select('*, profiles(*), events(title)')
      .in('event_id', eventIds)
      .order('purchase_date', { ascending: false });

    if (error) {
      toast({ title: "Error fetching tickets", description: error.message, variant: "destructive" });
    } else {
      setTickets(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleUpdateStatus = async (ticketId, newStatus) => {
    setUpdatingTicketId(ticketId);
    const { error } = await supabase
      .from('tickets')
      .update({ status: newStatus })
      .eq('id', ticketId);

    if (error) {
      toast({ title: `Failed to ${newStatus === 'Confirmed' ? 'approve' : 'reject'} payment`, description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Payment ${newStatus === 'Confirmed' ? 'Approved' : 'Rejected'}`, description: "The ticket status has been updated." });
      fetchTickets();
    }
    setUpdatingTicketId(null);
  };

  const renderTicketList = (status) => {
    const filteredTickets = tickets.filter(ticket => ticket.status === status);

    if (filteredTickets.length === 0) {
      return <p className="text-white/70 text-center py-8">No tickets with status "{status}".</p>;
    }

    return (
      <div className="space-y-4">
        {filteredTickets.map(ticket => (
          <Card key={ticket.id} className="bg-white/5 border-white/10 flex flex-col md:flex-row justify-between items-start p-4">
            <div className="flex-grow mb-4 md:mb-0">
              <p className="font-bold text-white">{ticket.events.title}</p>
              <p className="text-sm text-white/80">Attendee: {ticket.profiles?.name || 'N/A'} ({ticket.profiles?.email || 'N/A'})</p>
              <p className="text-sm text-white/80">Date: {new Date(ticket.purchase_date).toLocaleString()}</p>
              <p className="text-sm text-white/80">Payment Method: {ticket.payment_provider}</p>
              {ticket.payment_proof_url && (
                <a href={ticket.payment_proof_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="link" className="text-cyan-400 p-0 h-auto mt-2">
                    <FileText className="h-4 w-4 mr-2"/>View Proof
                  </Button>
                </a>
              )}
            </div>
            {status === 'Pending Confirmation' && (
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  size="sm" 
                  className="bg-green-500 hover:bg-green-600" 
                  onClick={() => handleUpdateStatus(ticket.id, 'Confirmed')}
                  disabled={updatingTicketId === ticket.id}
                >
                  {updatingTicketId === ticket.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="h-4 w-4 mr-2" />Approve</>}
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive" 
                  onClick={() => handleUpdateStatus(ticket.id, 'Rejected')}
                  disabled={updatingTicketId === ticket.id}
                >
                  {updatingTicketId === ticket.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><XCircle className="h-4 w-4 mr-2" />Reject</>}
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    );
  };

  const pendingCount = tickets.filter(t => t.status === 'Pending Confirmation').length;

  return (
    <>
      <Helmet>
        <title>Manage Payments - EventHost</title>
        <meta name="description" content="Approve or reject bank transfer payments for your events." />
      </Helmet>
      <div className="pt-20 pb-12 px-4 min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-left mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Manage Payments</h1>
            <p className="text-xl text-white/80">Approve or reject payments for your events.</p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-8"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>
          ) : (
            <Tabs defaultValue="pending" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6 bg-black/20 border border-white/10">
                <TabsTrigger value="pending">
                  <Clock className="h-4 w-4 mr-2" />
                  Pending
                  {pendingCount > 0 && <Badge variant="secondary" className="ml-2 bg-yellow-500 text-black">{pendingCount}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="confirmed"><CheckCircle className="h-4 w-4 mr-2" />Confirmed</TabsTrigger>
                <TabsTrigger value="rejected"><XCircle className="h-4 w-4 mr-2" />Rejected</TabsTrigger>
              </TabsList>
              <TabsContent value="pending">
                <Card className="glass-effect border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white">Pending Payments</CardTitle>
                    <CardDescription>These payments are awaiting your approval.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {renderTicketList('Pending Confirmation')}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="confirmed">
                <Card className="glass-effect border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white">Confirmed Payments</CardTitle>
                    <CardDescription>These payments have been successfully approved.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {renderTicketList('Confirmed')}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="rejected">
                <Card className="glass-effect border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white">Rejected Payments</CardTitle>
                    <CardDescription>These payments have been rejected.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {renderTicketList('Rejected')}
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

export default PaymentManagementPage;