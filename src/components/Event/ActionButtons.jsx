import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Ticket, Armchair, UserCheck } from 'lucide-react';
import GuestRegistrationDialog from '@/components/Event/GuestRegistrationDialog';
import { toast } from '@/components/ui/use-toast';

export const ActionButtons = ({ event }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isGuestRegDialogOpen, setIsGuestRegDialogOpen] = useState(false);

    const isEventOver = new Date(`${event.date}T${event.time}`).getTime() < new Date().getTime();

    const handleGetAccess = () => {
        if (!user) {
            if (event.allow_guest_registration) {
                setIsGuestRegDialogOpen(true);
            } else {
                navigate('/auth');
            }
            return;
        }

        if (event.price > 0) {
            if (event.seating_chart_enabled) {
                navigate(`/select-seats/${event.id}`);
            } else {
                navigate(`/checkout/${event.id}`);
            }
        } else if (event.is_virtual) {
            navigate(`/live/${event.id}`);
        } else {
            toast({ title: "🎉 Free Ticket Reserved!", description: "Check your email for confirmation." });
        }
    };

    if (!user) {
        return (
            <div className="space-y-3">
                <Button onClick={() => navigate('/auth')} className="w-full bg-white text-purple-600 hover:bg-white/90 font-medium py-3 text-base">
                    <Ticket className="mr-2 h-5 w-5" />
                    Login to Register
                </Button>
                {event.allow_guest_registration && (
                    <Dialog open={isGuestRegDialogOpen} onOpenChange={setIsGuestRegDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="w-full bg-white/10 text-white border-white/20 hover:bg-white/20 font-medium py-3 text-base">
                                <UserCheck className="mr-2 h-5 w-5" />
                                Register as Guest
                            </Button>
                        </DialogTrigger>
                        <GuestRegistrationDialog event={event} onSuccess={() => setIsGuestRegDialogOpen(false)} />
                    </Dialog>
                )}
            </div>
        );
    }
    
    return (
        <Button onClick={handleGetAccess} className="w-full bg-white text-purple-600 hover:bg-white/90 font-medium py-3 text-base" disabled={isEventOver}>
            {isEventOver ? "Event Finished" : (event.seating_chart_enabled ? <Armchair className="mr-2 h-5 w-5"/> : <Ticket className="mr-2 h-5 w-5"/>)}
            {isEventOver ? "Finished" : (event.seating_chart_enabled ? 'Choose Seats' : 'Get Ticket')}
        </Button>
    );
};