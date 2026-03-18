import React from 'react';
import { User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const Header = ({ event }) => {
    return (
        <div className="relative h-80 rounded-2xl overflow-hidden shadow-2xl">
            <img alt={`${event.title} banner`} className="w-full h-full object-cover" src={event.image} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            <div className="absolute bottom-6 left-6 text-white">
                {event.isRecurring && <Badge className="mb-2 bg-purple-500 capitalize">{event.recurringType} Event</Badge>}
                <h1 className="text-4xl font-bold">{event.title}</h1>
                <div className="flex items-center text-white/90 mt-2">
                    <User className="h-5 w-5 mr-2" />
                    Organized by {event.organizer}
                </div>
            </div>
        </div>
    );
};