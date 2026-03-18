import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, MapPin, ArrowRight, Video, Bookmark, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/components/ui/use-toast';
import { backendClient } from '@/lib/backendClient';
import { useAuth } from '@/context/SupabaseAuthContext';

const HomePage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [bookmarks, setBookmarks] = useState([]);
  const { user } = useAuth();

  const categories = ['all', 'music', 'technology', 'business', 'sports', 'arts', 'food', 'livestream', 'podcast', 'conference', 'study-group', 'live-shop'];

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      let query = backendClient.from('events').select('*').eq('status', 'Approved');

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching events:', error);
        toast({ title: "Error", description: "Could not fetch events.", variant: "destructive" });
      } else {
        setEvents(data);
      }
      setLoading(false);
    };

    fetchEvents();
  }, []);

  const toggleBookmark = (e, eventId) => {
    e.preventDefault();
    e.stopPropagation();
    toast({ title: "Feature Coming Soon!", description: "Bookmarking will be available soon." });
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) || (event.description && event.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || event.category === selectedCategory;
    const matchesPrice = event.price >= priceRange[0] && (priceRange[1] === 500 ? true : event.price <= priceRange[1]);
    return matchesSearch && matchesCategory && matchesPrice;
  });

  const featuredEvents = events.slice(0, 4);

  return (
    <div className="pt-16 min-h-screen">
      <section className="relative py-20 px-4 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">Discover Amazing<span className="block gradient-text">Experiences</span></h1>
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">Find events that inspire and connect you. Your next great experience is just a click away.</p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto mb-8">
            <Input placeholder="Search for events, organizers, or tags..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-white/10 border-white/20 text-white placeholder:text-white/60" />
            <Button className="bg-white text-purple-600 hover:bg-white/90 font-medium">Search</Button>
          </div>
        </motion.div>
      </section>

      {loading ? (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      ) : featuredEvents.length > 0 && (
        <section className="pb-12">
            <h2 className="text-3xl font-bold text-white text-center mb-8">Featured Events</h2>
            <div className="relative">
                <div className="flex overflow-x-auto gap-8 px-4 sm:px-8 lg:px-16 pb-6">
                    {featuredEvents.map((event, index) => (
                         <motion.div key={event.id} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: index * 0.1 }} className="flex-shrink-0 w-[320px]">
                            <Link to={`/event/${event.id}`} className="block event-card rounded-2xl overflow-hidden h-full">
                                <div className="relative h-48 overflow-hidden"><img alt={`${event.title} image`} className="w-full h-full object-cover" src={event.image_url}/></div>
                                <div className="p-4"><h3 className="text-lg font-bold text-white truncate">{event.title}</h3><p className="text-white/70 text-sm">{new Date(event.date).toLocaleDateString()}</p></div>
                            </Link>
                         </motion.div>
                    ))}
                </div>
            </div>
        </section>
      )}

      <section className="px-4 mb-12">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
            <div className="flex flex-wrap gap-3 justify-center mb-8">
              {categories.map(c => <Button key={c} variant={selectedCategory === c ? "default" : "outline"} onClick={() => setSelectedCategory(c)} className={`capitalize ${selectedCategory === c ? 'bg-white text-purple-600' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`}>{c.replace('-', ' ')}</Button>)}
            </div>
            <div className="max-w-md mx-auto space-y-3">
                <div className="flex justify-between text-white font-medium">
                    <label>Price Range</label>
                    <span>${priceRange[0]} - ${priceRange[1] === 500 ? '500+' : priceRange[1]}</span>
                </div>
                <Slider defaultValue={[0, 500]} max={500} step={10} onValueChange={setPriceRange} />
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-4 pb-20">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.4 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.map((event, index) => (
              <motion.div key={event.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: index * 0.1 }}>
                 <Link to={`/event/${event.id}`} className="block event-card rounded-2xl overflow-hidden h-full">
                    <div className="relative h-48 overflow-hidden">
                      <img alt={`${event.title} img`} className="w-full h-full object-cover" src={event.image_url} />
                      <div className="absolute top-4 left-4 flex gap-2"><Badge className="bg-white/20 text-white border-white/30 capitalize">{event.category.replace('-', ' ')}</Badge>{event.is_virtual && <Badge className="bg-purple-600/80 text-white">Virtual</Badge>}</div>
                      <Button size="icon" variant="ghost" className="absolute top-2 right-2 bg-black/30 hover:bg-black/60 text-white rounded-full" onClick={(e) => toggleBookmark(e, event.id)}>
                        <Bookmark className={`transition-colors ${bookmarks.includes(event.id) ? 'text-purple-400 fill-purple-400' : ''}`} />
                      </Button>
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-white mb-2">{event.title}</h3>
                      <div className="flex items-center text-white/80 text-sm mb-2"><Calendar className="h-4 w-4 mr-2" />{new Date(event.date).toLocaleDateString()} at {new Date(event.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                      <div className="flex items-center text-white/80 text-sm mb-4">{event.is_virtual ? <Video className="h-4 w-4 mr-2" /> : <MapPin className="h-4 w-4 mr-2" />}{event.is_virtual ? 'Online Event' : event.location}</div>
                      <div className="flex items-center justify-between">
                        <div className="text-white"><span className="text-2xl font-bold">{event.price === 0 ? 'Free' : `$${event.price.toFixed(2)}`}</span></div>
                        <Button className="bg-white text-purple-600 hover:bg-white/90">Details <ArrowRight className="h-4 w-4 ml-1" /></Button>
                      </div>
                    </div>
                  </Link>
              </motion.div>
            ))}
          </motion.div>
          {!loading && filteredEvents.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
              <p className="text-white/70 text-lg">No events found. Try adjusting your filters!</p>
              <Link to="/create-event"><Button className="mt-4 bg-white text-purple-600 hover:bg-white/90">Create an Event</Button></Link>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
};

export default HomePage;