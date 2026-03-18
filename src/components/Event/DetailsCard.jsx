import React from 'react';
import { Calendar, MapPin, Users, DollarSign, Video } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const DetailsCard = ({ event }) => {
    return (
        <Card className="glass-effect border-white/20">
            <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6 text-center">
                    <div className="space-y-1">
                        <Calendar className="h-8 w-8 mx-auto text-purple-300 mb-2"/>
                        <p className="text-white font-bold">{new Date(event.date).toLocaleDateString()}</p>
                        <p className="text-white/70 text-sm">{event.time}</p>
                    </div>
                    <div className="space-y-1">
                        {event.isVirtual ? <Video className="h-8 w-8 mx-auto text-purple-300 mb-2"/> : <MapPin className="h-8 w-8 mx-auto text-purple-300 mb-2"/>}
                        <p className="text-white font-bold">{event.isVirtual ? 'Online' : 'In-Person'}</p>
                        <p className="text-white/70 text-sm truncate">{event.location}</p>
                    </div>
                    <div className="space-y-1">
                        <Users className="h-8 w-8 mx-auto text-purple-300 mb-2"/>
                        <p className="text-white font-bold">{event.capacity}</p>
                        <p className="text-white/70 text-sm">Capacity</p>
                    </div>
                    <div className="space-y-1">
                        <DollarSign className="h-8 w-8 mx-auto text-purple-300 mb-2"/>
                        <p className="text-white font-bold">{event.price === 0 ? 'Free' : `$${event.price.toFixed(2)}`}</p>
                        <p className="text-white/70 text-sm">Price</p>
                    </div>
                </div>
                {event.tags && event.tags.length > 0 && 
                    <div className="flex flex-wrap gap-2 mb-6">
                        {event.tags.map(tag => <Badge key={tag} className="bg-white/10 text-white capitalize">{tag}</Badge>)}
                    </div>
                }
                <div>
                    <h3 className="text-xl font-bold text-white mb-3">About This Event</h3>
                    <p className="text-white/80 leading-relaxed whitespace-pre-wrap">{event.description}</p>
                </div>
            </CardContent>
        </Card>
    );
};