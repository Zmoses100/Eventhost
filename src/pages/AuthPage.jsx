import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const AuthPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const defaultTab = searchParams.get('tab') || 'login';
    const { signIn, signUp, profile } = useAuth();
    const [loading, setLoading] = useState(false);

    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');

    const [registerName, setRegisterName] = useState('');
    const [registerEmail, setRegisterEmail] = useState('');
    const [registerPassword, setRegisterPassword] = useState('');
    const [role, setRole] = useState('Attendee');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        const { error, data } = await signIn(loginEmail, loginPassword);
        if (!error && data.user) {
            toast({ title: "Login Successful!", description: "Welcome back! Redirecting..." });
            // Redirection is now handled by SupabaseAuthContext
        }
        setLoading(false);
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!registerName || !registerEmail || !registerPassword) {
            toast({ title: "Registration Failed", description: "Please fill out all fields.", variant: "destructive" });
            return;
        }
        setLoading(true);
        const { error } = await signUp(registerEmail, registerPassword, {
            data: { name: registerName, role: role }
        });
        if (!error) {
            toast({ title: "Registration Successful!", description: "Please check your email to verify your account." });
            setRegisterName('');
            setRegisterEmail('');
            setRegisterPassword('');
            setRole('Attendee');
            navigate('/auth?tab=login');
        }
        setLoading(false);
    };
    
    const handlePasswordReset = async () => {
        if (!loginEmail) {
            toast({ title: 'Email required', description: 'Please enter your email address to reset password.', variant: 'destructive' });
            return;
        }
        setLoading(true);
        const { error } = await supabase.auth.resetPasswordForEmail(loginEmail, {
            redirectTo: `${window.location.origin}/profile`,
        });
        if (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Password Reset Email Sent', description: 'Check your inbox for a link to reset your password.' });
        }
        setLoading(false);
    };

    return (
        <div className="pt-24 pb-12 px-4 min-h-screen flex items-center justify-center">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-md">
                <Tabs defaultValue={defaultTab} className="w-full" onValueChange={(tab) => navigate(`/auth?tab=${tab}`, { replace: true })}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="login">Login</TabsTrigger>
                        <TabsTrigger value="register">Sign Up</TabsTrigger>
                    </TabsList>
                    <TabsContent value="login">
                        <Card className="glass-effect border-white/20">
                            <CardHeader><CardTitle className="text-2xl text-white">Welcome Back</CardTitle><CardDescription className="text-white/70">Enter your credentials to access your account.</CardDescription></CardHeader>
                            <CardContent>
                                <form onSubmit={handleLogin} className="space-y-4">
                                    <div className="space-y-2"><Label htmlFor="login-email" className="text-white">Email</Label><Input id="login-email" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required className="bg-white/10 border-white/20 text-white" placeholder="your@email.com" /></div>
                                    <div className="space-y-2"><Label htmlFor="login-password" className="text-white">Password</Label><Input id="login-password" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required className="bg-white/10 border-white/20 text-white" placeholder="••••••••" /></div>
                                    <Button type="submit" className="w-full bg-white text-purple-600 hover:bg-white/90" disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} {loading ? 'Logging in...' : 'Login'}</Button>
                                    <Button type="button" variant="link" className="w-full text-white/70" onClick={handlePasswordReset}>Forgot your password?</Button>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="register">
                        <Card className="glass-effect border-white/20">
                            <CardHeader><CardTitle className="text-2xl text-white">Create an Account</CardTitle><CardDescription className="text-white/70">Join our community of event creators and attendees.</CardDescription></CardHeader>
                            <CardContent>
                                <form onSubmit={handleRegister} className="space-y-4">
                                    <div className="space-y-2"><Label htmlFor="register-name" className="text-white">Full Name</Label><Input id="register-name" value={registerName} onChange={(e) => setRegisterName(e.target.value)} required className="bg-white/10 border-white/20 text-white" placeholder="John Doe" /></div>
                                    <div className="space-y-2"><Label htmlFor="register-email" className="text-white">Email</Label><Input id="register-email" type="email" value={registerEmail} onChange={(e) => setRegisterEmail(e.target.value)} required className="bg-white/10 border-white/20 text-white" placeholder="your@email.com" /></div>
                                    <div className="space-y-2"><Label htmlFor="register-password" className="text-white">Password</Label><Input id="register-password" type="password" value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} required className="bg-white/10 border-white/20 text-white" placeholder="At least 6 characters" /></div>
                                    <div className="space-y-2">
                                        <Label htmlFor="role" className="text-white">Account Type</Label>
                                        <Select onValueChange={setRole} defaultValue={role}>
                                            <SelectTrigger id="role" className="w-full bg-white/10 border-white/20 text-white">
                                                <SelectValue placeholder="Select an account type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Attendee">Attendee</SelectItem>
                                                <SelectItem value="Event Organizer">Event Organizer</SelectItem>
                                                <SelectItem value="Speaker">Speaker</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button type="submit" className="w-full bg-white text-purple-600 hover:bg-white/90" disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} {loading ? 'Signing up...' : 'Sign Up'}</Button>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </motion.div>
        </div>
    );
};

export default AuthPage;