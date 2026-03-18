import React from 'react';
import { Clock, Mic } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const SpeakersSection = ({ speakers }) => {
    if (!speakers || speakers.length === 0) return null;

    return (
        <Card className="glass-effect border-white/20">
            <CardHeader><CardTitle className="text-white flex items-center"><Mic className="mr-2"/>Speakers</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {speakers.map((speaker, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                        <Avatar><AvatarImage src={`https://i.pravatar.cc/150?u=${speaker.name}`} /><AvatarFallback>{speaker.name.charAt(0)}</AvatarFallback></Avatar>
                        <div><p className="font-bold text-white">{speaker.name}</p><p className="text-sm text-white/70">{speaker.title}</p></div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

const ScheduleTimeline = ({ schedule }) => {
    if (!schedule || schedule.length === 0) return null;

    return (
        <Card className="glass-effect border-white/20">
            <CardHeader><CardTitle className="text-white flex items-center"><Clock className="mr-2"/>Schedule</CardTitle></CardHeader>
            <CardContent className="space-y-3">
                {schedule.map((item, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
                        <p className="font-bold text-purple-300 w-20">{item.time}</p>
                        <div className="border-l-2 border-purple-400 pl-4">
                            <p className="font-bold text-white">{item.topic}</p>
                            <p className="text-sm text-white/70">{item.speaker}</p>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

export const ScheduleSection = ({ event }) => {
    return (
        <>
            <SpeakersSection speakers={event.speakers} />
            <ScheduleTimeline schedule={event.schedule} />
        </>
    );
};