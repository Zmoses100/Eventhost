import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Ticket, CheckCircle, Armchair, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import SeatPicker from '@/components/SeatPicker';
import { backendClient } from '@/lib/backendClient';

const SeatSelectionPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeats, setSelectedSeats] = useState([]);
  // Mock seats for now until `seat_reservations` table is properly used
  const [seats, setSeats] = useState([]);

  const fetchEventData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await backendClient
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error || !data) {
      toast({ title: 'Event not found', variant: 'destructive' });
      navigate('/');
      return;
    }
    setEvent(data);
    
    // MOCK SEAT GENERATION
    if (data.seating_chart_enabled && data.seating_rows && data.seating_cols) {
        const generatedSeats = [];
        for (let r = 0; r < data.seating_rows; r++) {
            for (let c = 0; c < data.seating_cols; c++) {
                const rowChar = String.fromCharCode(65 + r);
                generatedSeats.push({
                    id: `${rowChar}${c + 1}`,
                    row: r,
                    col: c,
                    status: 'available' // MOCK, should check reservations
                });
            }
        }
        setSeats(generatedSeats);
    }

    setLoading(false);
  }, [eventId, navigate]);


  useEffect(() => {
    fetchEventData();
  }, [fetchEventData]);

  const handleSelectSeat = (seat) => {
    setSelectedSeats(prev => {
      if (prev.some(s => s.id === seat.id)) {
        return prev.filter(s => s.id !== seat.id);
      } else {
        return [...prev, seat];
      }
    });
  };

  const handleProceed = () => {
    if (selectedSeats.length === 0) {
      toast({
        title: "No seats selected",
        description: "Please select at least one seat to proceed.",
        variant: "destructive",
      });
      return;
    }
    navigate(`/checkout/${event.id}`, { state: { selectedSeats, event } });
  };

  if (loading) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!event || !event.seating_chart_enabled) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center text-center">
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Seat Selection Not Available</h2>
          <p className="text-white/70 mb-6">This event does not have a seating map.</p>
          <Link to={`/event/${eventId}`}>
            <Button className="bg-white text-purple-600 hover:bg-white/90">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Event
            </Button>
          </Link>
        </div>
      </div>
    );
  }
  
  const total = (event.price || 0) * selectedSeats.length;
  const seatingConfig = { rows: event.seating_rows, cols: event.seating_cols };

  return (
    <div className="pt-24 pb-12 px-4 min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-7xl mx-auto"
      >
        <Link to={`/event/${eventId}`} className="inline-flex items-center text-white/80 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Event
        </Link>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="glass-effect border-white/20">
              <CardHeader>
                <CardTitle className="text-2xl text-white flex items-center">
                  <Armchair className="h-6 w-6 mr-3" />
                  Choose Your Seats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SeatPicker
                  seats={seats}
                  seating={seatingConfig}
                  selectedSeats={selectedSeats}
                  onSelectSeat={handleSelectSeat}
                />
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-1">
            <Card className="glass-effect border-white/20 sticky top-24">
              <CardHeader>
                <CardTitle className="text-xl text-white flex items-center">
                  <Ticket className="h-5 w-5 mr-2" />
                  Your Selection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <h3 className="font-bold text-lg text-white">{event.title}</h3>
                <div className="border-t border-white/20 pt-4 space-y-2">
                  <div className="flex justify-between items-center text-white/80">
                    <span>Seat Price</span>
                    <span className="text-white font-medium">${(event.price || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-white/80">
                    <span>Selected Seats</span>
                    <span className="text-white font-medium">{selectedSeats.length}</span>
                  </div>
                </div>
                <div className="border-t border-white/20 pt-4">
                  <div className="flex justify-between items-center text-white text-xl font-bold">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
                {selectedSeats.length > 0 && (
                  <div className="border-t border-white/20 pt-4">
                    <h4 className="text-white/80 mb-2">Selected:</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedSeats.map(seat => (
                        <Badge key={seat.id} className="bg-purple-600 text-white">{seat.id}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="pt-4">
                  <Button onClick={handleProceed} className="w-full bg-white text-purple-600 hover:bg-white/90 font-medium py-3" disabled={selectedSeats.length === 0}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Proceed to Checkout
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SeatSelectionPage;