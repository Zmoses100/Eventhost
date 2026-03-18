import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowLeft, Download, Ticket, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Helmet } from 'react-helmet';
import { backendClient } from '@/lib/backendClient';
import { toast } from '@/components/ui/use-toast';

const PaymentSuccessPage = () => {
    const [searchParams] = useSearchParams();
    const eventId = searchParams.get('eventId');
    const orderId = searchParams.get('orderId');
    const paymentType = searchParams.get('type');
    const ticketId = searchParams.get('ticketId');
    const [event, setEvent] = useState(null);
    const [ticket, setTicket] = useState(null);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (eventId) {
                const { data: eventData } = await backendClient.from('events').select('*').eq('id', eventId).single();
                if (eventData) setEvent(eventData);
            }
            if (ticketId) {
                const { data: ticketData } = await backendClient.from('tickets').select('*').eq('id', ticketId).single();
                if (ticketData) setTicket(ticketData);
            }
        };
        fetchData();
    }, [eventId, ticketId]);

    const handleDownloadTicket = async () => {
        setGenerating(true);
        const { data, error } = await backendClient.functions.invoke('generate-ticket', {
            body: { ticket_id: ticketId },
        });

        if (error) {
            toast({ title: 'Error generating ticket', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Ticket Generated!', description: 'Your ticket is ready for download.' });
            // Re-fetch ticket to get new download URLs
            const { data: ticketData } = await backendClient.from('tickets').select('*').eq('id', ticketId).single();
            if (ticketData) setTicket(ticketData);
            if (data.pdfUrl) {
                window.open(data.pdfUrl, '_blank');
            }
        }
        setGenerating(false);
    };

    const hasTicketFiles = ticket?.download_url_pdf || ticket?.download_url_png;

    return (
        <>
            <Helmet>
                <title>Payment Successful! - EventHost</title>
                <meta name="description" content="Your ticket purchase was successful." />
            </Helmet>
            <div className="pt-24 pb-12 px-4 min-h-screen flex items-center justify-center">
                <motion.div 
                    initial={{ opacity: 0, y: 30 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ duration: 0.6 }}
                    className="w-full max-w-lg"
                >
                    <Card className="glass-effect border-white/20 text-white">
                        <CardHeader className="items-center text-center">
                            <CheckCircle className="h-16 w-16 text-green-400 mb-4" />
                            <CardTitle className="text-3xl">Payment Successful!</CardTitle>
                            <p className="text-white/70">Thank you for your purchase.</p>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {event && (
                                <div className="p-4 bg-white/5 rounded-lg text-center">
                                    <h4 className="font-bold text-lg">{event.title}</h4>
                                    <p className="text-sm text-white/80">{new Date(event.date).toLocaleDateString()}</p>
                                    <p className="text-sm text-white/80">{event.is_virtual ? 'Virtual Event' : event.location}</p>
                                </div>
                            )}
                            <div className="text-sm space-y-2 text-center">
                                <p><span className="font-semibold">Transaction ID:</span> {orderId || 'N/A'}</p>
                                <p><span className="font-semibold">Payment Method:</span> <span className="capitalize">{paymentType || 'Stripe'}</span></p>
                                {ticket && <p><span className="font-semibold">Ticket ID:</span> {ticket.id}</p>}
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Button asChild className="w-full bg-white text-purple-600 hover:bg-white/90">
                                    <Link to={`/dashboard`}>
                                        <Ticket className="h-4 w-4 mr-2" />
                                        Go to My Tickets
                                    </Link>
                                </Button>
                                {hasTicketFiles ? (
                                    <a href={ticket.download_url_pdf || ticket.download_url_png} target="_blank" rel="noreferrer" className="w-full">
                                        <Button variant="outline" className="w-full bg-white/10 text-white border-white/20 hover:bg-white/20">
                                            <Download className="h-4 w-4 mr-2" />
                                            Download Ticket
                                        </Button>
                                    </a>
                                ) : (
                                    <Button variant="outline" className="w-full bg-white/10 text-white border-white/20 hover:bg-white/20" onClick={handleDownloadTicket} disabled={generating}>
                                        {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                                        {generating ? 'Generating...' : 'Generate Ticket'}
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </>
    );
};

export default PaymentSuccessPage;