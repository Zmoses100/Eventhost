import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Video, Radio, Code, Zap } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import useLocalStorage from '@/hooks/use-local-storage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const integrationTemplates = [
  {
    name: 'Zoom',
    description: 'Connect your Zoom account to host virtual meetings and webinars seamlessly.',
    icon: <Video className="h-8 w-8 text-blue-500" />,
  },
  {
    name: 'StreamYard',
    description: 'Easily broadcast professional-looking live streams directly from your browser.',
    icon: <Radio className="h-8 w-8 text-blue-400" />,
  },
  {
    name: 'Broadcast API',
    description: 'Integrate with any custom RTMP/RTMPS streaming service for full control.',
    icon: <Code className="h-8 w-8 text-green-500" />,
  },
  {
    name: 'Stripe',
    description: 'Connect Stripe to process payments for your ticketed events securely.',
    icon: <Zap className="h-8 w-8 text-purple-500" />,
  },
];

const IntegrationsPage = () => {
  const [integrations, setIntegrations] = useLocalStorage('integrations_status', {
    Zoom: { connected: false },
    StreamYard: { connected: false },
    'Broadcast API': { connected: false, endpoint: '', key: '' },
    Stripe: { connected: false, publishableKey: '' },
  });

  const [apiDetails, setApiDetails] = useState({
    endpoint: integrations['Broadcast API']?.endpoint || '',
    key: integrations['Broadcast API']?.key || '',
  });
  const [isApiDialogOpen, setIsApiDialogOpen] = useState(false);

  const [stripeDetails, setStripeDetails] = useState({
    publishableKey: integrations['Stripe']?.publishableKey || '',
  });
  const [isStripeDialogOpen, setIsStripeDialogOpen] = useState(false);

  const handleApiConnect = () => {
    if (!apiDetails.endpoint || !apiDetails.key) {
      toast({
        title: 'Error',
        description: 'Please fill in both API Endpoint and Stream Key.',
        variant: 'destructive',
      });
      return;
    }
    setIntegrations(prev => ({
      ...prev,
      'Broadcast API': { connected: true, ...apiDetails },
    }));
    toast({
      title: 'Success!',
      description: 'Broadcast API has been connected.',
    });
    setIsApiDialogOpen(false);
  };

  const handleApiDisconnect = () => {
    setIntegrations(prev => ({
      ...prev,
      'Broadcast API': { connected: false, endpoint: '', key: '' },
    }));
    setApiDetails({ endpoint: '', key: '' });
    toast({
      title: 'Broadcast API Disconnected',
    });
  };

  const handleStripeConnect = () => {
    if (!stripeDetails.publishableKey) {
      toast({
        title: 'Error',
        description: 'Please fill in your Stripe Publishable Key.',
        variant: 'destructive',
      });
      return;
    }
    setIntegrations(prev => ({
      ...prev,
      Stripe: { connected: true, publishableKey: stripeDetails.publishableKey },
    }));
    toast({
      title: 'Success!',
      description: 'Stripe has been connected.',
    });
    setIsStripeDialogOpen(false);
  };

  const handleStripeDisconnect = () => {
    setIntegrations(prev => ({
      ...prev,
      Stripe: { connected: false, publishableKey: '' },
    }));
    setStripeDetails({ publishableKey: '' });
    toast({
      title: 'Stripe Disconnected',
    });
  };

  const handleSimpleConnect = (name) => {
    setIntegrations(prev => ({
      ...prev,
      [name]: { connected: true },
    }));
    toast({
      title: 'Success!',
      description: `${name} has been connected.`,
    });
  };

  const handleSimpleDisconnect = (name) => {
    setIntegrations(prev => ({
      ...prev,
      [name]: { connected: false },
    }));
    toast({
      title: `${name} Disconnected`,
    });
  };

  return (
    <div className="pt-24 pb-12 px-4 min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto"
      >
        <div className="text-left mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Integrations</h1>
          <p className="text-xl text-white/80">Connect your favorite tools to supercharge your events.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {integrationTemplates.map((integration, index) => {
            const status = integrations[integration.name];
            const isConnected = status?.connected;

            return (
              <motion.div
                key={integration.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="glass-effect border-white/20 h-full flex flex-col">
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-white/10 rounded-lg">{integration.icon}</div>
                      <CardTitle className="text-2xl text-white">{integration.name}</CardTitle>
                    </div>
                    <Badge variant={isConnected ? 'default' : 'secondary'} className={isConnected ? 'bg-green-500/80 text-white' : 'bg-white/20 text-white'}>
                      {isConnected ? 'Connected' : 'Not Connected'}
                    </Badge>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <CardDescription className="text-white/70">{integration.description}</CardDescription>
                    {isConnected && integration.name === 'Broadcast API' && (
                      <div className="mt-4 text-sm text-white/80">
                        <p className="font-bold">Endpoint:</p>
                        <p className="truncate">{integrations['Broadcast API'].endpoint}</p>
                      </div>
                    )}
                    {isConnected && integration.name === 'Stripe' && integrations.Stripe.publishableKey && (
                       <div className="mt-4 text-sm text-white/80">
                          <p className="font-bold">Publishable Key:</p>
                          <p className="truncate">{`${integrations.Stripe.publishableKey.substring(0,12)}...`}</p>
                       </div>
                    )}
                  </CardContent>
                  <div className="p-6 pt-0">
                    {isConnected ? (
                      <Button
                        onClick={() => {
                          if (integration.name === 'Zoom' || integration.name === 'StreamYard') handleSimpleDisconnect(integration.name);
                          else if (integration.name === 'Broadcast API') handleApiDisconnect();
                          else if (integration.name === 'Stripe') handleStripeDisconnect();
                        }}
                        variant="destructive"
                        className="w-full"
                      >
                        Disconnect
                      </Button>
                    ) : (
                      <>
                        {(integration.name === 'Zoom' || integration.name === 'StreamYard') && (
                          <Button onClick={() => handleSimpleConnect(integration.name)} className="w-full bg-white text-purple-600 hover:bg-white/90 font-medium">Connect</Button>
                        )}
                        {integration.name === 'Broadcast API' && (
                          <Dialog open={isApiDialogOpen} onOpenChange={setIsApiDialogOpen}>
                            <DialogTrigger asChild>
                              <Button className="w-full bg-white text-purple-600 hover:bg-white/90 font-medium">Connect</Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                              <DialogHeader>
                                <DialogTitle>Connect Broadcast API</DialogTitle>
                                <DialogDescription>Enter your RTMP/RTMPS stream details.</DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <Label htmlFor="endpoint" className="text-right text-white/80">Endpoint</Label>
                                  <Input id="endpoint" value={apiDetails.endpoint} onChange={(e) => setApiDetails({ ...apiDetails, endpoint: e.target.value })} className="col-span-3 bg-white/10 border-white/20 text-white" placeholder="rtmp://a.rtmp.youtube.com/live2" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <Label htmlFor="key" className="text-right text-white/80">Stream Key</Label>
                                  <Input id="key" type="password" value={apiDetails.key} onChange={(e) => setApiDetails({ ...apiDetails, key: e.target.value })} className="col-span-3 bg-white/10 border-white/20 text-white" placeholder="••••••••••••••••" />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button type="submit" onClick={handleApiConnect} className="bg-white text-purple-600 hover:bg-white/90">Save connection</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}
                        {integration.name === 'Stripe' && (
                          <Dialog open={isStripeDialogOpen} onOpenChange={setIsStripeDialogOpen}>
                            <DialogTrigger asChild>
                              <Button className="w-full bg-white text-purple-600 hover:bg-white/90 font-medium">Connect</Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                              <DialogHeader>
                                <DialogTitle>Connect Stripe</DialogTitle>
                                <DialogDescription>Enter your Stripe Publishable Key.</DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <Label htmlFor="publishableKey" className="text-right text-white/80">Publishable Key</Label>
                                  <Input id="publishableKey" value={stripeDetails.publishableKey} onChange={(e) => setStripeDetails({ ...stripeDetails, publishableKey: e.target.value })} className="col-span-3 bg-white/10 border-white/20 text-white" placeholder="pk_live_..." />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button type="submit" onClick={handleStripeConnect} className="bg-white text-purple-600 hover:bg-white/90">Save connection</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}
                      </>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default IntegrationsPage;