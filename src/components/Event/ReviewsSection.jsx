import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import useLocalStorage from '@/hooks/use-local-storage';

export const ReviewsSection = ({ eventId, isEventOver }) => {
    const [reviews, setReviews] = useLocalStorage(`reviews_${eventId}`, []);
    const [newReview, setNewReview] = useState({ name: '', rating: 0, comment: '' });

    const handleReviewSubmit = (e) => {
        e.preventDefault();
        if (newReview.comment && newReview.name && newReview.rating > 0) {
            setReviews(prev => [...prev, { ...newReview, id: Date.now() }]);
            setNewReview({ name: '', rating: 0, comment: '' });
            toast({ title: "Review Submitted!", description: "Thanks for your feedback." });
        } else {
            toast({ title: "Incomplete Review", description: "Please provide your name, rating and a comment.", variant: "destructive" });
        }
    };

    return (
        <Card className="glass-effect border-white/20">
            <CardHeader><CardTitle className="text-white flex items-center"><Star className="mr-2"/>Reviews</CardTitle></CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {reviews.map(r => (
                        <div key={r.id} className="p-3 bg-white/5 rounded-lg">
                            <div className="flex justify-between items-center mb-1">
                                <p className="font-bold text-white">{r.name}</p>
                                <div className="flex">{[...Array(5)].map((_, i) => <Star key={i} className={`h-4 w-4 ${i < r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-white/30'}`}/>)}</div>
                            </div>
                            <p className="text-sm text-white/80">{r.comment}</p>
                        </div>
                    ))}
                    {reviews.length === 0 && <p className="text-white/70 text-center py-4">No reviews yet. Be the first!</p>}
                </div>
                {isEventOver && 
                    <form onSubmit={handleReviewSubmit} className="mt-6 border-t border-white/10 pt-6 space-y-4">
                        <h4 className="text-lg font-bold text-white">Leave a Review</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1"><Label className="text-white">Your Name</Label><Input value={newReview.name} onChange={e => setNewReview({...newReview, name: e.target.value})} className="bg-white/10 border-white/20 text-white" /></div>
                            <div className="space-y-1"><Label className="text-white">Rating</Label><div className="flex items-center gap-1 mt-2">{[...Array(5)].map((_, i) => <Star key={i} onClick={() => setNewReview({...newReview, rating: i + 1})} className={`h-6 w-6 cursor-pointer ${i < newReview.rating ? 'text-yellow-400 fill-yellow-400' : 'text-white/30'}`}/>)}</div></div>
                        </div>
                        <div className="space-y-1"><Label className="text-white">Comment</Label><Textarea value={newReview.comment} onChange={e => setNewReview({...newReview, comment: e.target.value})} className="bg-white/10 border-white/20 text-white min-h-[80px]"/></div>
                        <Button type="submit" className="bg-white text-purple-600 hover:bg-white/90">Submit Review</Button>
                    </form>
                }
            </CardContent>
        </Card>
    );
};