import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { backendClient } from '@/lib/backendClient';
import { useAuth } from '@/context/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { ArrowLeft, CreditCard, Ticket, User, Calendar, MapPin, Loader2, Landmark } from 'lucide-react';
import { PayPalButtons, PayPalScriptProvider, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Helmet } from 'react-helmet';
import { v4 as uuidv4 } from 'uuid';

const CheckoutPage = () => {
  const { eventId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { ticketTypeId, ticketCount: count } = location.state || { ticketTypeId: null, ticketCount: 1 };
  
  const [event, setEvent] = useState(null);
  const [ticketType, setTicketType] = useState(null);
  const [organizer, setOrganizer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ticketCount, setTicketCount] = useState(count || 1);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  const stripe = useStripe();
  const elements = useElements();
  const [{ isPending }] = usePayPalScriptReducer();

  const fetchEventData = useCallback(async () => {
    setLoading(true);
    const { data: eventData, error: eventError } = await backendClient
      .from('events')
      .select('*, profiles(id, name, paypal_email, bank_transfer_details)')
      .eq('id', eventId)
      .single();

    if (eventError) {
      setError('Failed to load event details.');
      setLoading(false);
      return;
    }
    
    setEvent(eventData);
    setOrganizer(eventData.profiles);

    if (ticketTypeId) {
      const { data: ttData, error: ttError } = await backendClient
        .from('ticket_types')
        .select('*')
        .eq('id', ticketTypeId)
        .single();
      if (ttError) {
        setError('Failed to load ticket type details.');
      } else {
        setTicketType(ttData);
      }
    } else {
      // For events without specific ticket types, create a mock one from event price
      setTicketType({
        id: null,
        name: 'General Admission',
        price: eventData.price,
      });
    }

    setLoading(false);
  }, [eventId, ticketTypeId]);

  useEffect(() => {
    fetchEventData();
  }, [fetchEventData]);

  useEffect(() => {
    if (!loading && !user) {
      toast({
        title: 'Please Register or Login',
        description: 'You need an account to complete the checkout.',
        variant: 'destructive'
      });
      navigate(`/auth?redirect=/checkout/${eventId}`);
    }
  }, [user, loading, navigate, eventId]);

  const totalPrice = ticketType ? ticketType.price * ticketCount : 0;

  const handleCreateTicket = async (paymentDetails) => {
    if (!user || !event || !ticketType) return;

    const { data: ticketData, error } = await backendClient.from('tickets').insert([
      {
        event_id: event.id,
        user_id: user.id,
        price_paid: totalPrice,
        payment_provider: paymentDetails.provider,
        transaction_id: paymentDetails.transactionId,
        seat_info: { ticketCount }, // Simplified, as seats are for a different flow
        status: paymentDetails.provider === 'Bank Transfer' ? 'Pending Confirmation' : 'Confirmed',
        ticket_type_id: ticketType.id,
      },
    ]).select().single();

    if (error) {
      toast({ title: 'Ticket Creation Failed', description: error.message, variant: 'destructive' });
      setProcessing(false);
      return;
    }

    // Trigger ticket generation if payment is confirmed
    if (ticketData.status === 'Confirmed') {
        backendClient.functions.invoke('generate-ticket', {
            body: { ticket_id: ticketData.id },
        }).catch(err => console.error("Error invoking ticket generation function:", err));
    }

    if (paymentDetails.provider === 'Bank Transfer') {
        navigate(`/bank-transfer-pending?ticketId=${ticketData.id}`);
    } else {
        toast({ title: 'Purchase Successful!', description: 'Your ticket has been confirmed.' });
        navigate(`/payment-success?eventId=${event.id}&ticketId=${ticketData.id}&orderId=${paymentDetails.transactionId}&type=${paymentDetails.provider}`);
    }
  };

  const handleBankTransfer = async () => {
    setProcessing(true);
    await handleCreateTicket({
      provider: 'Bank Transfer',
      transactionId: `bt_${uuidv4()}`,
    });
    setProcessing(false);
  };

  const handleStripeSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    const cardElement = elements.getElement(CardElement);

    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
    });

    if (error) {
      toast({ title: 'Payment Failed', description: error.message, variant: 'destructive' });
      setProcessing(false);
    } else {
      await handleCreateTicket({
        provider: 'Stripe',
        transactionId: paymentMethod.id,
      });
    }
  };

  const hasBankDetails = organizer?.bank_transfer_details && organizer.bank_transfer_details.iban && organizer.bank_transfer_details.account_holder;

  if (loading || !user || !ticketType) return <div className="min-h-screen pt-24 flex items-center justify-center text-center text-white py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (error) return <div className="text-center text-red-400 py-20">{error}</div>;
  if (!event) return <div className="text-center text-white py-20">Event not found.</div>;

  return (
    <>
    <Helmet>
        <title>Checkout - {event.title}</title>
        <meta name="description" content={`Complete your ticket purchase for ${event.title}.`} />
    </Helmet>
    <div className="pt-20 pb-12 px-4 min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto"
      >
        <Button variant="ghost" className="text-white hover:bg-white/10 mb-6" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5 mr-2" /> Back
        </Button>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="glass-effect border-white/20">
            <CardHeader>
              <CardTitle className="text-3xl text-white">Confirm Your Order</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <img  class="w-full h-48 object-cover rounded-lg mb-4" alt={event.title} src={event.image_url} src="https://images.unsplash.com/photo-1691257790470-b5e4e80ca59f" />
                <h2 className="text-2xl font-bold text-white">{event.title}</h2>
                <p className="text-white/80 flex items-center gap-2 mt-2"><Calendar className="h-4 w-4" /> {new Date(event.date).toLocaleString()}</p>
                <p className="text-white/80 flex items-center gap-2"><MapPin className="h-4 w-4" /> {event.is_virtual ? 'Virtual Event' : event.location}</p>
                <p className="text-white/80 flex items-center gap-2"><User className="h-4 w-4" /> Organized by {organizer?.name || 'N/A'}</p>
              </div>
              <div className="border-t border-white/20 pt-4">
                <h3 className="text-xl font-semibold text-white mb-4">Order Summary</h3>
                <div className="flex justify-between items-center text-white/90">
                  <p className="flex items-center gap-2"><Ticket className="h-5 w-5" /> {ticketType.name} ({ticketCount}x)</p>
                  <p>${(ticketType.price * ticketCount).toFixed(2)}</p>
                </div>
                 <div className="flex justify-between items-center text-white/90 mt-2">
                  <p>Service Fee</p>
                  <p>$0.00</p>
                </div>
                <div className="border-t border-white/20 mt-4 pt-4 flex justify-between items-center text-xl font-bold text-white">
                  <p>Total</p>
                  <p>${totalPrice.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-effect border-white/20">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Payment Method</CardTitle>
              <CardDescription>All transactions are secure and encrypted.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {organizer?.paypal_email && (
                <>
                  {(isPending || processing) && <div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}
                  <PayPalButtons
                    style={{ layout: 'vertical', color: 'blue', shape: 'rect', label: 'pay', height: 40 }}
                    key={organizer.paypal_email}
                    createOrder={(data, actions) => {
                      setProcessing(true);
                      return actions.order.create({
                        purchase_units: [{
                          amount: { value: totalPrice.toFixed(2) },
                          payee: { email_address: organizer.paypal_email }
                        }]
                      });
                    }}
                    onApprove={async (data, actions) => {
                      try {
                        const details = await actions.order.capture();
                        await handleCreateTicket({
                          provider: 'PayPal',
                          transactionId: details.id,
                        });
                      } catch (err) {
                        toast({ title: 'PayPal Payment Error', description: 'Failed to capture payment. Please try again.', variant: 'destructive' });
                        setProcessing(false);
                      }
                    }}
                    onError={(err) => {
                      toast({ title: 'PayPal Error', description: 'An error occurred with your payment.', variant: 'destructive' });
                      setProcessing(false);
                    }}
                    disabled={processing || isPending}
                    onCancel={() => setProcessing(false)}
                  />
                </>
              )}

              <form onSubmit={handleStripeSubmit} className="space-y-4">
                <label className="text-white font-medium">Pay with Credit Card</label>
                <div className="p-3 rounded-md bg-white/10 border border-white/20">
                  <CardElement options={{
                    style: {
                      base: {
                        color: '#FFFFFF',
                        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
                        fontSmoothing: 'antialiased',
                        fontSize: '16px',
                        '::placeholder': {
                          color: '#aab7c4'
                        }
                      },
                      invalid: {
                        color: '#fa755a',
                        iconColor: '#fa755a'
                      }
                    }
                  }} />
                </div>
                <Button type="submit" className="w-full bg-indigo-500 hover:bg-indigo-600 text-white" disabled={processing || !stripe}>
                  {processing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : `Pay $${totalPrice.toFixed(2)}`}
                </Button>
              </form>

              {hasBankDetails && (
                <>
                  <div className="flex items-center gap-2">
                    <div className="flex-grow h-px bg-white/20"></div>
                    <span className="text-white/80">OR</span>
                    <div className="flex-grow h-px bg-white/20"></div>
                  </div>
                  <Button onClick={handleBankTransfer} className="w-full bg-green-600 hover:bg-green-700 text-white" disabled={processing}>
                    {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Landmark className="mr-2 h-4 w-4" />}
                    Pay with Bank Transfer
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
    </>
  );
};

const CheckoutPageWrapper = () => {
    const paypalOptions = {
        "client-id": import.meta.env.VITE_PAYPAL_CLIENT_ID || "test",
        currency: "USD",
        intent: "capture",
    };
    return (
        <PayPalScriptProvider options={paypalOptions}>
            <CheckoutPage />
        </PayPalScriptProvider>
    )
}

export default CheckoutPageWrapper;