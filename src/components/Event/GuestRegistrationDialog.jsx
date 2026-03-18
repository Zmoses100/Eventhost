import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/use-toast';

const GuestRegistrationDialog = ({ event, onSuccess }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGuestRegister = async (e) => {
    e.preventDefault();
    if (!agreedToTerms) {
      toast({ title: "Terms and Conditions", description: "You must agree to the terms and conditions.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/event/${event.id}`,
        data: {
          name: name,
          marketing_opt_in: marketingOptIn,
          is_guest: true,
        }
      }
    });

    setIsSubmitting(false);

    if (error) {
      toast({ title: "Registration Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email!", description: "We've sent a magic link to your email to complete your registration." });
      if (onSuccess) onSuccess();
    }
  };

  return (
    <DialogContent className="glass-effect border-white/20">
      <DialogHeader>
        <DialogTitle className="text-white">Register as a Guest</DialogTitle>
        <DialogDescription className="text-white/70">No password needed. We'll email you a secure link to access your ticket.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleGuestRegister} className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="guest-name" className="text-white">Full Name</Label>
          <Input id="guest-name" placeholder="Your Name" value={name} onChange={(e) => setName(e.target.value)} required className="bg-white/10 border-white/20 text-white" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="guest-email" className="text-white">Email Address</Label>
          <Input id="guest-email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-white/10 border-white/20 text-white" />
        </div>
        <div className="space-y-3 pt-2">
          <div className="flex items-start space-x-2">
            <Checkbox id="terms" checked={agreedToTerms} onCheckedChange={setAgreedToTerms} />
            <Label htmlFor="terms" className="text-sm text-white/80">I agree to the <Link to="/terms" className="underline">terms and conditions</Link>.</Label>
          </div>
          <div className="flex items-start space-x-2">
            <Checkbox id="marketing" checked={marketingOptIn} onCheckedChange={setMarketingOptIn} />
            <Label htmlFor="marketing" className="text-sm text-white/80">I'd like to receive marketing communications.</Label>
          </div>
        </div>
        <DialogFooter className="pt-4">
          <Button type="submit" className="w-full bg-white text-purple-600 hover:bg-white/90" disabled={isSubmitting}>
            {isSubmitting ? 'Sending Link...' : 'Register with Email'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
};

export default GuestRegistrationDialog;