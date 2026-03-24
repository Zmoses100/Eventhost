import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Plus, Search, User, LogOut, LayoutDashboard, Settings, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import SearchDialog from '@/components/SearchDialog';
import useLocalStorage from '@/hooks/use-local-storage';
import { useAuth } from '@/context/AuthContext';

const Navbar = () => {
  const location = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [events] = useLocalStorage('events', []);
  const { user, profile, signOut, loading } = useAuth();

  const handleLogout = () => {
    signOut();
  };

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50 glass-effect border-b border-white/10"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <Calendar className="h-8 w-8 text-white" />
            <span className="text-xl font-bold text-white">EventHost</span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className={`text-white/80 hover:text-white transition-colors ${location.pathname === '/' ? 'text-white font-medium' : ''}`}>
              Discover Events
            </Link>
            <Link to={user ? "/create-event" : "/auth"} className={`text-white/80 hover:text-white transition-colors ${location.pathname === '/create-event' ? 'text-white font-medium' : ''}`}>
              Create Event
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <Search className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-effect border-white/20 text-white">
                <DialogHeader>
                  <DialogTitle>Search Events</DialogTitle>
                </DialogHeader>
                <SearchDialog events={events} onLinkClick={() => setIsSearchOpen(false)} />
              </DialogContent>
            </Dialog>
            
            {!loading && (
              user ? (
                <>
                  <Link to="/create-event">
                    <Button className="bg-white text-purple-600 hover:bg-white/90 font-medium">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Event
                    </Button>
                  </Link>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full">
                        <User className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 glass-effect border-white/20 text-white" align="end" forceMount>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">{profile?.name || user.email}</p>
                          <p className="text-xs leading-none text-white/70">{user.email}</p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem asChild>
                          <Link to="/dashboard" className="cursor-pointer">
                              <LayoutDashboard className="mr-2 h-4 w-4" />
                              <span>Dashboard</span>
                          </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                          <Link to="/profile" className="cursor-pointer">
                              <Settings className="mr-2 h-4 w-4" />
                              <span>Account Settings</span>
                          </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                          <Link to="/messages" className="cursor-pointer">
                              <Mail className="mr-2 h-4 w-4" />
                              <span>Messages</span>
                          </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                          <Link to="/integrations" className="cursor-pointer">
                              <Settings className="mr-2 h-4 w-4" />
                              <span>Integrations</span>
                          </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-400 focus:text-red-400 focus:bg-red-500/10">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Link to="/auth">
                    <Button variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">Login</Button>
                  </Link>
                  <Link to="/auth?tab=register">
                    <Button className="bg-white text-purple-600 hover:bg-white/90 font-medium">Sign Up</Button>
                  </Link>
                </>
              )
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  );
};
export default Navbar;