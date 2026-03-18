import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { Loader2, CheckCircle, Clipboard, Landmark, User, Hash, Banknote, Calendar, MapPin } from 'lucide-react';
import { Helmet } from 'react-helmet';

const BankTransferPendingPage = () => {
  const [searchParams] = useSearchParams();
  const ticketId = searchParams.get('ticketId');
  const [ticket, setTicket] = useState(null);
  const [event, setEvent] = useState(null);
  const [organizer, setOrganizer] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTicketAndEvent = useCallback(async () => {
    if (!ticketId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: ticketData, error: ticketError } = await supabase
      .from('tickets')
      .select('*, events(*, profiles(*))')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticketData) {
      toast({ title: 'Error', description: 'Could not load your ticket information.', variant: 'destructive' });
      setLoading(false);
      return;
    }

    setTicket(ticketData);
    setEvent(ticketData.events);
    setOrganizer(ticketData.events.profiles);
    setLoading(false);
  }, [ticketId]);

  useEffect(() => {
    fetchTicketAndEvent();
  }, [fetchTicketAndEvent]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: 'Bank details copied to clipboard.' });
  };

  if (loading) {
    return <div className="min-h-screen pt-24 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>;
  }

  if (!ticket || !event || !organizer) {
    return <div className="min-h-screen pt-24 text-center text-white">Could not find your order details.</div>;
  }

  const bankDetails = organizer.bank_transfer_details;

  return (
    <>
      <Helmet>
        <title>Payment Pending - {event.title}</title>
        <meta name="description" content={`Your ticket for ${event.title} is pending. Complete the bank transfer to confirm your spot.`} />
      </Helmet>
      <div className="pt-20 pb-12 px-4 min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto text-center"
        >
          <CheckCircle className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Your Ticket is Pending!</h1>
          <p className="text-xl text-white/80 mb-8">
            To confirm your spot for <span className="font-bold text-white">{event.title}</span>, please complete the bank transfer using the details below.
          </p>

          <Card className="glass-effect border-white/20 text-left">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Bank Transfer Instructions</CardTitle>
              <CardDescription>Your ticket will be confirmed once the organizer receives your payment.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                <span className="text-white/70 flex items-center gap-2"><Banknote className="h-5 w-5" /> Amount to Pay:</span>
                <span className="font-bold text-xl text-white">${ticket.price_paid.toFixed(2)}</span>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-white">Beneficiary Details:</h3>
                {Object.entries({
                  "Account Holder": bankDetails.account_holder,
                  "IBAN": bankDetails.iban,
                  "SWIFT / BIC": bankDetails.swift_bic,
                  "Bank Name": bankDetails.bank_name,
                }).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                    <span className="text-white/70">{key}:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-white">{value}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-white/60 hover:text-white" onClick={() => copyToClipboard(value)}>
                        <Clipboard className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {bankDetails.reference_note && (
                <div className="p-3 bg-purple-900/30 border border-purple-500/50 rounded-lg">
                  <p className="text-purple-200"><span className="font-bold">Important:</span> {bankDetails.reference_note}</p>
                </div>
              )}
              
              <div className="p-3 bg-yellow-900/30 border border-yellow-500/50 rounded-lg">
                <p className="text-yellow-200">Please note: It may take a few business days for the payment to be confirmed. You will receive an email once your ticket is confirmed.</p>
              </div>

              <div className="border-t border-white/10 pt-4 mt-4">
                <h3 className="font-semibold text-white mb-2">Your Order Details:</h3>
                <p className="text-white/80 flex items-center gap-2"><User className="h-4 w-4" /> Ticket for: {event.title}</p>
                <p className="text-white/80 flex items-center gap-2"><Calendar className="h-4 w-4" /> Event Date: {new Date(event.date).toLocaleString()}</p>
                <p className="text-white/80 flex items-center gap-2"><MapPin className="h-4 w-4" /> Location: {event.is_virtual ? 'Virtual Event' : event.location}</p>
              </div>

              <Link to="/dashboard">
                <Button className="w-full mt-6 bg-white text-purple-600 hover:bg-white/90">
                  Go to My Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
};

export default BankTransferPendingPage;