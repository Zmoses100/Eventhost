import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { backendClient } from '@/lib/backendClient';
import { v4 as uuidv4 } from 'uuid';
import { X } from 'lucide-react';
import { useAuth } from '@/context/SupabaseAuthContext';

const ManageSponsorsDialog = ({ open, onOpenChange, event }) => {
    const { user } = useAuth();
    const [sponsors, setSponsors] = useState([]);
    const [name, setName] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [websiteUrl, setWebsiteUrl] = useState('');
    const logoInputRef = useRef(null);
  
    const fetchSponsors = async () => {
      const { data, error } = await backendClient.from('sponsors').select('*').eq('event_id', event.id);
      if (error) toast({ title: 'Error fetching sponsors', description: error.message, variant: 'destructive' });
      else setSponsors(data);
    };
  
    useEffect(() => {
      if (open) fetchSponsors();
    }, [open, event.id]);
  
    const handleLogoUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!user) {
        toast({ title: 'Authentication Error', description: 'You must be logged in to upload images.', variant: 'destructive'});
        return;
      }
      const fileName = `${user.id}/sponsors/${uuidv4()}-${file.name}`;
      const { error } = await backendClient.storage.from('brand_logos').upload(fileName, file);
      if (error) {
        toast({ title: 'Logo upload failed', description: error.message, variant: 'destructive' });
        return;
      }
      const { data: { publicUrl } } = backendClient.storage.from('brand_logos').getPublicUrl(fileName);
      setLogoUrl(publicUrl);
      toast({ title: 'Logo uploaded successfully!' });
    };
  
    const handleAddSponsor = async () => {
      if (!name) {
        toast({ title: 'Sponsor name is required', variant: 'destructive' });
        return;
      }
      const { error } = await backendClient.from('sponsors').insert({
        event_id: event.id,
        name,
        logo_url: logoUrl,
        website_url: websiteUrl
      });
      if (error) toast({ title: 'Failed to add sponsor', description: error.message, variant: 'destructive' });
      else {
        toast({ title: 'Sponsor added!' });
        setName(''); setLogoUrl(''); setWebsiteUrl('');
        fetchSponsors();
      }
    };
  
    const handleRemoveSponsor = async (sponsorId) => {
      const { error } = await backendClient.from('sponsors').delete().eq('id', sponsorId);
      if (error) toast({ title: 'Failed to remove sponsor', description: error.message, variant: 'destructive' });
      else {
        toast({ title: 'Sponsor removed' });
        fetchSponsors();
      }
    };
  
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="glass-effect">
          <DialogHeader><DialogTitle className="text-white">Manage Sponsors</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <h3 className="font-semibold text-white">Add New Sponsor</h3>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Sponsor Name" className="bg-white/10 border-white/20 text-white" />
            <Input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="Sponsor Website URL" className="bg-white/10 border-white/20 text-white" />
            <div className="flex items-center gap-2">
              <Input value={logoUrl} placeholder="Logo URL or upload" className="bg-white/10 border-white/20 text-white" readOnly />
              <input type="file" ref={logoInputRef} onChange={handleLogoUpload} className="hidden" accept="image/png, image/jpeg" />
              <Button onClick={() => logoInputRef.current.click()} variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">Upload</Button>
            </div>
            <Button onClick={handleAddSponsor}>Add Sponsor</Button>
          </div>
          <div className="mt-6 space-y-2">
            <h3 className="font-semibold text-white">Current Sponsors</h3>
            {sponsors.map(sponsor => (
              <div key={sponsor.id} className="flex justify-between items-center p-2 bg-white/5 rounded">
                <div className="flex items-center gap-2">
                  <img src={sponsor.logo_url || `https://api.dicebear.com/6x/initials/svg?seed=${sponsor.name}`} alt={sponsor.name} className="w-8 h-8 rounded object-contain bg-white/20" />
                  <span className="text-white">{sponsor.name}</span>
                </div>
                <Button onClick={() => handleRemoveSponsor(sponsor.id)} variant="ghost" size="icon" className="text-red-400 hover:text-red-500"><X className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    );
};

export default ManageSponsorsDialog;