import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { Calendar, Search } from 'lucide-react';
import { DialogClose } from '@/components/ui/dialog';

const SearchDialog = ({ events, onLinkClick }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEvents = searchTerm
    ? events.filter(event =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (event.tags && event.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
      )
    : [];

  return (
    <div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/60" />
        <Input
          placeholder="Search for events, organizers, or tags..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 w-full bg-white/10 border-white/20 text-white placeholder:text-white/60"
        />
      </div>
      <div className="mt-4 max-h-[60vh] overflow-y-auto">
        {filteredEvents.length > 0 ? (
          <motion.ul
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.05
                }
              }
            }}
            initial="hidden"
            animate="show"
            className="space-y-2"
          >
            {filteredEvents.map(event => (
              <motion.li key={event.id} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                <DialogClose asChild>
                  <Link to={`/event/${event.id}`} onClick={onLinkClick} className="block p-3 rounded-lg hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-4">
                      <img src={event.image} alt={event.title} className="w-16 h-10 object-cover rounded-md flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate">{event.title}</p>
                        <p className="text-sm text-white/70 flex items-center gap-2"><Calendar className="h-3 w-3" /> {new Date(event.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </Link>
                </DialogClose>
              </motion.li>
            ))}
          </motion.ul>
        ) : (
          searchTerm && <p className="text-center text-white/70 py-8">No results found.</p>
        )}
      </div>
    </div>
  );
};

export default SearchDialog;