import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import useLocalStorage from '@/hooks/use-local-storage';
import { ArrowLeft, Save, DollarSign } from 'lucide-react';

const AdminSettingsPage = () => {
  const [settings, setSettings] = useLocalStorage('platform_settings', {
    platformName: 'EventHost',
    maintenanceMode: false,
    allowEventCreation: true,
    commissionRate: 5,
  });

  const [localSettings, setLocalSettings] = useState(settings);

  const handleSave = () => {
    setSettings(localSettings);
    toast({
      title: 'Settings Saved!',
      description: 'Your changes have been successfully saved.',
    });
  };

  return (
    <div className="pt-12 pb-12 px-4 min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto"
      >
        <div className="flex items-center mb-8">
          <Link to="/super-admin/dashboard">
            <Button variant="ghost" className="text-white hover:bg-white/10 mr-4">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-white">Platform Settings</h1>
        </div>

        <div className="space-y-6">
          <Card className="glass-effect border-white/20">
            <CardHeader>
              <CardTitle className="text-2xl text-white">General Settings</CardTitle>
              <CardDescription className="text-white/70">Manage global platform configurations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="platformName" className="text-white">Platform Name</Label>
                <Input
                  id="platformName"
                  value={localSettings.platformName}
                  onChange={(e) => setLocalSettings({ ...localSettings, platformName: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/20 p-4">
                <div>
                  <Label htmlFor="maintenance-mode" className="text-white">Maintenance Mode</Label>
                  <p className="text-sm text-white/60">Temporarily disable public access to the site.</p>
                </div>
                <Switch
                  id="maintenance-mode"
                  checked={localSettings.maintenanceMode}
                  onCheckedChange={(checked) => setLocalSettings({ ...localSettings, maintenanceMode: checked })}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/20 p-4">
                <div>
                  <Label htmlFor="allow-event-creation" className="text-white">Allow Event Creation</Label>
                  <p className="text-sm text-white/60">Enable or disable new event submissions by users.</p>
                </div>
                <Switch
                  id="allow-event-creation"
                  checked={localSettings.allowEventCreation}
                  onCheckedChange={(checked) => setLocalSettings({ ...localSettings, allowEventCreation: checked })}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-effect border-white/20">
            <CardHeader>
              <CardTitle className="text-2xl text-white flex items-center"><DollarSign className="h-5 w-5 mr-2" /> Monetization</CardTitle>
              <CardDescription className="text-white/70">Configure payment settings and commissions.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="commissionRate" className="text-white">Commission Rate (%)</Label>
                <Input
                  id="commissionRate"
                  type="number"
                  min="0"
                  max="100"
                  value={localSettings.commissionRate}
                  onChange={(e) => setLocalSettings({ ...localSettings, commissionRate: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                />
                <p className="text-sm text-white/60">The percentage your platform takes from each ticket sale.</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} className="bg-white text-purple-600 hover:bg-white/90">
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminSettingsPage;