import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';

export const Timer = ({ event }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        if (!event) return;

        const interval = setInterval(() => {
            const eventDate = new Date(`${event.date}T${event.time}`).getTime();
            const now = new Date().getTime();
            const distance = eventDate - now;

            if (distance < 0) {
                setTimeLeft("Event has started");
                clearInterval(interval);
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        }, 1000);

        return () => clearInterval(interval);
    }, [event]);

    const isEventOver = new Date(`${event.date}T${event.time}`).getTime() < new Date().getTime();
    if (!timeLeft || isEventOver) return null;

    return (
        <Card className="glass-effect border-white/20">
            <CardContent className="p-6 text-center">
                <div className="text-white/80 font-bold tracking-widest text-sm mb-2">EVENT STARTS IN</div>
                <div className="text-4xl font-bold text-white">{timeLeft}</div>
            </CardContent>
        </Card>
    );
};