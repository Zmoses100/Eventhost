import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import useLocalStorage from '@/hooks/use-local-storage';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, MailWarning, Save, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

const AdminSettingsPage = () => {
  const [settings, setSettings] = useLocalStorage('platform_settings', {
    platformName: 'EventHost',
    maintenanceMode: false,
    allowEventCreation: true,
    commissionRate: 5,
  });

  const [localSettings, setLocalSettings] = useState(settings);
  const [emailSettings, setEmailSettings] = useState({
    enabled: false,
    queueEnabled: false,
    requireEmailVerification: true,
    allowUnverifiedLogin: true,
    mailer: 'smtp',
    smtpHost: '',
    smtpPort: 587,
    smtpUsername: '',
    smtpPassword: '',
    encryption: 'tls',
    fromEmail: '',
    fromName: 'Eventhost',
    replyToEmail: '',
    hasSmtpPassword: false,
  });
  const [emailStatus, setEmailStatus] = useState({ configured: false, issues: [] });
  const [diagnostic, setDiagnostic] = useState(null);
  const [testEmail, setTestEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  useEffect(() => {
    const loadEmailSettings = async () => {
      const { data, error } = await supabase.admin.getEmailSettings();
      if (error) {
        toast({ title: 'Could not load email settings', description: error.message, variant: 'destructive' });
        return;
      }
      const loaded = data?.settings || {};
      setEmailSettings((prev) => ({ ...prev, ...loaded, smtpPassword: '' }));
      setEmailStatus(data?.status || { configured: false, issues: [] });
      setDiagnostic(data?.diagnostic || null);
    };
    loadEmailSettings();
  }, []);

  const handleSave = () => {
    setSettings(localSettings);
    toast({
      title: 'Settings Saved!',
      description: 'Your changes have been successfully saved.',
    });
  };

  const handleSaveEmailSettings = async () => {
    setSavingEmail(true);
    const payload = {
      ...emailSettings,
      smtpPassword: emailSettings.smtpPassword,
    };
    const { data, error } = await supabase.admin.saveEmailSettings(payload);
    if (error) {
      toast({ title: 'Email settings not saved', description: error.message, variant: 'destructive' });
    } else {
      setEmailSettings((prev) => ({
        ...prev,
        ...(data?.settings || {}),
        smtpPassword: '',
      }));
      setEmailStatus(data?.status || { configured: false, issues: [] });
      setDiagnostic(data?.diagnostic || null);
      toast({ title: 'Email settings saved', description: data?.message || 'Email settings updated successfully.' });
    }
    setSavingEmail(false);
  };

  const handleSendTestEmail = async () => {
    const destination = testEmail.trim() || emailSettings.replyToEmail || emailSettings.fromEmail;
    if (!destination) {
      toast({ title: 'Test email address required', description: 'Provide a destination email for the test message.', variant: 'destructive' });
      return;
    }
    setSavingEmail(true);
    const { data, error } = await supabase.admin.sendTestEmail(destination);
    if (error) {
      toast({ title: 'Test email failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Test email sent', description: data?.message || `Email sent to ${destination}.` });
    }
    setSavingEmail(false);
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
          {!emailStatus.configured ? (
            <Alert className="border-amber-300/40 bg-amber-500/10 text-amber-100">
              <MailWarning className="h-4 w-4" />
              <AlertTitle>Email system requires attention</AlertTitle>
              <AlertDescription>
                {emailStatus.issues?.[0] || 'Email configuration is incomplete. Registration can continue, but email-dependent flows may be limited.'}
              </AlertDescription>
            </Alert>
          ) : null}

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
              <CardTitle className="text-2xl text-white">Email Settings</CardTitle>
              <CardDescription className="text-white/70">Configure SMTP delivery for verification, password reset, notifications, and welcome emails.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border border-white/20 p-4">
                <div>
                  <Label htmlFor="email-enabled" className="text-white">Enable Email Sending</Label>
                  <p className="text-sm text-white/60">Turn transactional and notification email delivery on or off.</p>
                </div>
                <Switch
                  id="email-enabled"
                  checked={emailSettings.enabled}
                  onCheckedChange={(checked) => setEmailSettings({ ...emailSettings, enabled: checked })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Mail Driver</Label>
                  <Select value={emailSettings.mailer} onValueChange={(value) => setEmailSettings({ ...emailSettings, mailer: value })}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="smtp">SMTP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Encryption</Label>
                  <Select value={emailSettings.encryption} onValueChange={(value) => setEmailSettings({ ...emailSettings, encryption: value })}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tls">TLS</SelectItem>
                      <SelectItem value="ssl">SSL</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-white">SMTP Host</Label>
                  <Input value={emailSettings.smtpHost} onChange={(e) => setEmailSettings({ ...emailSettings, smtpHost: e.target.value })} className="bg-white/10 border-white/20 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">SMTP Port</Label>
                  <Input
                    type="number"
                    min="1"
                    value={emailSettings.smtpPort}
                    onChange={(e) => {
                      const nextPort = Number(e.target.value);
                      setEmailSettings({ ...emailSettings, smtpPort: Number.isInteger(nextPort) && nextPort > 0 ? nextPort : emailSettings.smtpPort });
                    }}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">SMTP Username</Label>
                  <Input value={emailSettings.smtpUsername} onChange={(e) => setEmailSettings({ ...emailSettings, smtpUsername: e.target.value })} className="bg-white/10 border-white/20 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">SMTP Password</Label>
                  <Input type="password" value={emailSettings.smtpPassword} onChange={(e) => setEmailSettings({ ...emailSettings, smtpPassword: e.target.value })} placeholder={emailSettings.hasSmtpPassword ? 'Saved password (leave blank to keep)' : 'Enter SMTP password'} className="bg-white/10 border-white/20 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">From Email</Label>
                  <Input type="email" value={emailSettings.fromEmail} onChange={(e) => setEmailSettings({ ...emailSettings, fromEmail: e.target.value })} className="bg-white/10 border-white/20 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">From Name</Label>
                  <Input value={emailSettings.fromName} onChange={(e) => setEmailSettings({ ...emailSettings, fromName: e.target.value })} className="bg-white/10 border-white/20 text-white" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-white">Reply-To Email</Label>
                  <Input type="email" value={emailSettings.replyToEmail} onChange={(e) => setEmailSettings({ ...emailSettings, replyToEmail: e.target.value })} className="bg-white/10 border-white/20 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between rounded-lg border border-white/20 p-4">
                  <div>
                    <Label className="text-white">Require Email Verification</Label>
                    <p className="text-sm text-white/60">Require users to verify email before login.</p>
                  </div>
                  <Switch checked={emailSettings.requireEmailVerification} onCheckedChange={(checked) => setEmailSettings({ ...emailSettings, requireEmailVerification: checked })} />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-white/20 p-4">
                  <div>
                    <Label className="text-white">Allow Non-Verified Login</Label>
                    <p className="text-sm text-white/60">Permit login if verification email is unavailable.</p>
                  </div>
                  <Switch checked={emailSettings.allowUnverifiedLogin} onCheckedChange={(checked) => setEmailSettings({ ...emailSettings, allowUnverifiedLogin: checked })} />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-white/20 p-4 md:col-span-2">
                  <div>
                    <Label className="text-white">Queue Emails</Label>
                    <p className="text-sm text-white/60">Record queue preference for deployments that process email asynchronously.</p>
                  </div>
                  <Switch checked={emailSettings.queueEnabled} onCheckedChange={(checked) => setEmailSettings({ ...emailSettings, queueEnabled: checked })} />
                </div>
              </div>

              {diagnostic?.lastError ? (
                <Alert className="border-red-300/40 bg-red-500/10 text-red-100">
                  <AlertTitle>Last email error</AlertTitle>
                  <AlertDescription>{diagnostic.lastError}</AlertDescription>
                </Alert>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                <Input
                  type="email"
                  placeholder="test-recipient@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="bg-white/10 border-white/20 text-white"
                />
                <Button type="button" variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20" onClick={handleSendTestEmail} disabled={savingEmail}>
                  Send Test Email
                </Button>
              </div>

              <div className="flex justify-end">
                <Button type="button" onClick={handleSaveEmailSettings} className="bg-white text-purple-600 hover:bg-white/90" disabled={savingEmail}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Email Settings
                </Button>
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
