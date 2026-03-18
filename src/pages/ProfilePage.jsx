import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/SupabaseAuthContext';
import { backendClient } from '@/lib/backendClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Upload, Save, User, KeyRound } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { Mail, Landmark } from 'lucide-react';

const ProfilePage = () => {
  const { user, profile, loading: authLoading, updateProfile, updatePassword } = useAuth();
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    bio: '',
    profile_picture_url: '',
    paypal_email: '',
    bank_transfer_details: {
      account_holder: '',
      iban: '',
      swift_bic: '',
      bank_name: '',
      reference_note: ''
    }
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  useEffect(() => {
    if (profile) {
      setProfileData({
        name: profile.name || '',
        bio: profile.bio || '',
        profile_picture_url: profile.profile_picture_url || '',
        paypal_email: profile.paypal_email || '',
        bank_transfer_details: profile.bank_transfer_details || { account_holder: '', iban: '', swift_bic: '', bank_name: '', reference_note: '' }
      });
      setAvatarPreview(profile.profile_picture_url || '');
    }
  }, [profile]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleBankDetailsChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      bank_transfer_details: {
        ...prev.bank_transfer_details,
        [name]: value
      }
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    let avatarUrl = profileData.profile_picture_url;

    if (avatarFile) {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await backendClient.storage
        .from('profile_pictures')
        .upload(filePath, avatarFile, { upsert: true });

      if (uploadError) {
        toast({ title: 'Avatar Upload Failed', description: uploadError.message, variant: 'destructive' });
        setSaving(false);
        return;
      }

      const { data: urlData } = backendClient.storage
        .from('profile_pictures')
        .getPublicUrl(filePath);
      
      avatarUrl = urlData.publicUrl;
    }

    const updates = {
      id: user.id,
      name: profileData.name,
      bio: profileData.bio,
      profile_picture_url: avatarUrl,
      paypal_email: profileData.paypal_email,
      bank_transfer_details: profileData.bank_transfer_details,
      updated_at: new Date(),
    };

    const { error } = await backendClient.from('profiles').upsert(updates);

    if (error) {
      toast({ title: 'Save Failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Profile Saved!', description: 'Your profile has been updated successfully.' });
      const updatedProfileData = { ...profile, ...updates };
      updateProfile(updatedProfileData);
      setProfileData(prev => ({...prev, ...updatedProfileData, profile_picture_url: avatarUrl }));
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast({ title: 'Password is too short', description: 'Password should be at least 6 characters.', variant: 'destructive' });
      return;
    }
    setPasswordSaving(true);
    const { error } = await updatePassword(passwordData.newPassword);
    if (!error) {
      setPasswordData({ newPassword: '', confirmPassword: '' });
    }
    setPasswordSaving(false);
  };

  if (authLoading) {
    return <div className="min-h-screen pt-24 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>;
  }

  return (
    <>
      <Helmet>
        <title>My Profile - Manage Your Account</title>
        <meta name="description" content="View and edit your profile details, payment information, and account settings." />
      </Helmet>
      <div className="pt-20 pb-12 px-4 min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-8">My Profile</h1>
          
          <Card className="glass-effect border-white/20">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Profile Information</CardTitle>
              <CardDescription>Update your personal details here.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={avatarPreview} />
                  <AvatarFallback><User className="h-12 w-12" /></AvatarFallback>
                </Avatar>
                <div className="flex-grow">
                  <Label htmlFor="avatar-upload" className="text-white">Profile Picture</Label>
                  <div className="relative mt-2">
                    <Input id="avatar-upload" type="file" onChange={handleAvatarChange} accept="image/*" className="hidden" />
                    <Button asChild variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                      <label htmlFor="avatar-upload" className="cursor-pointer">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Image
                      </label>
                    </Button>
                  </div>
                  <p className="text-xs text-white/60 mt-2">PNG, JPG, GIF up to 10MB.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="name" className="text-white">Full Name</Label>
                  <Input id="name" name="name" value={profileData.name} onChange={handleInputChange} className="mt-2 bg-white/10 border-white/20 text-white" />
                </div>
                <div>
                  <Label htmlFor="email" className="text-white">Email Address</Label>
                  <Input id="email" value={user?.email || ''} disabled className="mt-2 bg-gray-700/50 border-gray-600 text-gray-400" />
                </div>
              </div>

              <div>
                <Label htmlFor="bio" className="text-white">Bio</Label>
                <Textarea id="bio" name="bio" value={profileData.bio} onChange={handleInputChange} placeholder="Tell us a little about yourself" className="mt-2 bg-white/10 border-white/20 text-white min-h-[100px]" />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} className="bg-white text-purple-600 hover:bg-white/90">
                {saving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
                Save Profile
              </Button>
            </CardFooter>
          </Card>

          <Card className="glass-effect border-white/20 mt-8">
            <CardHeader>
              <CardTitle className="text-2xl text-white flex items-center"><KeyRound className="mr-3 h-6 w-6 text-yellow-400" /> Security</CardTitle>
              <CardDescription>Change your password here.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input 
                  id="newPassword" 
                  name="newPassword" 
                  type="password" 
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className="mt-2 bg-white/10 border-white/20 text-white" 
                  placeholder="Enter new password"
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input 
                  id="confirmPassword" 
                  name="confirmPassword" 
                  type="password" 
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className="mt-2 bg-white/10 border-white/20 text-white" 
                  placeholder="Confirm new password"
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleChangePassword} disabled={passwordSaving} className="bg-white text-purple-600 hover:bg-white/90">
                {passwordSaving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
                Update Password
              </Button>
            </CardFooter>
          </Card>

          {profile?.role === 'Event Organizer' && (
            <Card className="glass-effect border-white/20 mt-8">
              <CardHeader>
                <CardTitle className="text-2xl text-white">Payment Settings</CardTitle>
                <CardDescription>Configure how you receive payments for your events. This information is shown to attendees at checkout.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center"><Mail className="h-5 w-5 mr-3 text-blue-400" /> PayPal</h3>
                  <Label htmlFor="paypal_email" className="text-white">PayPal Email Address</Label>
                  <Input id="paypal_email" name="paypal_email" type="email" value={profileData.paypal_email} onChange={handleInputChange} placeholder="your.paypal@example.com" className="mt-2 bg-white/10 border-white/20 text-white" />
                </div>
                
                <div className="border-t border-white/10 pt-8">
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center"><Landmark className="h-5 w-5 mr-3 text-green-400" /> Bank Transfer</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="account_holder" className="text-white">Account Holder Name</Label>
                      <Input id="account_holder" name="account_holder" value={profileData.bank_transfer_details.account_holder} onChange={handleBankDetailsChange} className="mt-2 bg-white/10 border-white/20 text-white" />
                    </div>
                    <div>
                      <Label htmlFor="iban" className="text-white">IBAN</Label>
                      <Input id="iban" name="iban" value={profileData.bank_transfer_details.iban} onChange={handleBankDetailsChange} className="mt-2 bg-white/10 border-white/20 text-white" />
                    </div>
                    <div>
                      <Label htmlFor="swift_bic" className="text-white">SWIFT / BIC</Label>
                      <Input id="swift_bic" name="swift_bic" value={profileData.bank_transfer_details.swift_bic} onChange={handleBankDetailsChange} className="mt-2 bg-white/10 border-white/20 text-white" />
                    </div>
                    <div>
                      <Label htmlFor="bank_name" className="text-white">Bank Name</Label>
                      <Input id="bank_name" name="bank_name" value={profileData.bank_transfer_details.bank_name} onChange={handleBankDetailsChange} className="mt-2 bg-white/10 border-white/20 text-white" />
                    </div>
                    <div>
                      <Label htmlFor="reference_note" className="text-white">Reference Note for Attendees</Label>
                      <Textarea id="reference_note" name="reference_note" value={profileData.bank_transfer_details.reference_note} onChange={handleBankDetailsChange} placeholder="e.g., 'Please include your name and the event title in the payment reference.'" className="mt-2 bg-white/10 border-white/20 text-white" />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button onClick={handleSave} disabled={saving} className="bg-white text-purple-600 hover:bg-white/90">
                  {saving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
                  Save Payment Settings
                </Button>
              </CardFooter>
            </Card>
          )}

        </motion.div>
      </div>
    </>
  );
};

export default ProfilePage;