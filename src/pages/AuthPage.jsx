import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { backendClient } from '@/lib/backendClient';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const AuthPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const defaultTab = searchParams.get('tab') || 'login';
    const verifyToken = searchParams.get('verify_token') || '';
    const resetToken = searchParams.get('reset_token') || '';
    const { signIn, signUp } = useAuth();
    const [loading, setLoading] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const verifiedTokenRef = useRef('');
    const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

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
        if (registerPassword.length < 6) {
            toast({ title: "Registration Failed", description: "Password must be at least 6 characters.", variant: "destructive" });
            return;
        }
        setLoading(true);
        const { error, data } = await signUp(registerEmail, registerPassword, {
            data: { name: registerName, role: role }
        });
        if (!error) {
            const warningMessage = data?.meta?.warnings?.[0];
            const description = data?.meta?.requires_email_verification
                ? (data?.meta?.verification_email_sent
                    ? "Please check your email to verify your account."
                    : (warningMessage || "Your account was created, but verification email could not be sent right now."))
                : "Your account has been created successfully.";
            toast({ title: "Registration Successful!", description, variant: warningMessage ? "destructive" : "default" });
            setPendingVerificationEmail(registerEmail);
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
        const { error, data } = await backendClient.auth.resetPasswordForEmail(loginEmail);
        if (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Password Reset', description: data?.diagnostic || 'If your account exists, check your inbox for a reset link.' });
        }
        setLoading(false);
    };

    const handleResendVerification = async () => {
        const emailToUse = (pendingVerificationEmail || loginEmail).trim();
        if (!emailToUse) {
            toast({ title: 'Email required', description: 'Enter your account email first.', variant: 'destructive' });
            return;
        }
        setLoading(true);
        const { error, data } = await backendClient.auth.resendVerificationEmail(emailToUse);
        if (error) {
            toast({ title: 'Could not resend verification', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Verification Email', description: data?.message || 'If your account requires verification, an email has been sent.' });
        }
        setLoading(false);
    };

    const handleCompletePasswordReset = async (e) => {
        e.preventDefault();
        if (!resetToken) return;
        if (!newPassword || newPassword.length < 6) {
            toast({ title: 'Invalid password', description: 'Password must be at least 6 characters.', variant: 'destructive' });
            return;
        }
        if (newPassword !== confirmPassword) {
            toast({ title: 'Passwords do not match', description: 'Please re-enter your new password.', variant: 'destructive' });
            return;
        }
        setLoading(true);
        const { error } = await backendClient.auth.completePasswordReset({ token: resetToken, password: newPassword });
        if (error) {
            toast({ title: 'Reset failed', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Password updated', description: 'You can now log in with your new password.' });
            setNewPassword('');
            setConfirmPassword('');
            navigate('/auth?tab=login');
        }
        setLoading(false);
    };

    useEffect(() => {
        const runVerification = async () => {
            if (!verifyToken || verifiedTokenRef.current === verifyToken) return;
            verifiedTokenRef.current = verifyToken;
            setIsVerifying(true);
            const { error } = await backendClient.auth.verifyEmail(verifyToken);
            if (error) {
                toast({ title: 'Verification failed', description: error.message, variant: 'destructive' });
            } else {
                toast({ title: 'Email verified', description: 'Your account is now verified and signed in.' });
                navigate('/dashboard');
            }
            setIsVerifying(false);
        };
        runVerification();
    }, [verifyToken, navigate]);

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
                                    <Button type="button" variant="link" className="w-full text-white/70" onClick={handleResendVerification}>Resend verification email</Button>
                                </form>
                                {resetToken ? (
                                    <form onSubmit={handleCompletePasswordReset} className="space-y-4 mt-6 border-t border-white/10 pt-6">
                                        <p className="text-sm text-white/80">Set a new password for your account.</p>
                                        <div className="space-y-2"><Label htmlFor="new-password" className="text-white">New Password</Label><Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="bg-white/10 border-white/20 text-white" /></div>
                                        <div className="space-y-2"><Label htmlFor="confirm-password" className="text-white">Confirm Password</Label><Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="bg-white/10 border-white/20 text-white" /></div>
                                        <Button type="submit" className="w-full bg-white text-purple-600 hover:bg-white/90" disabled={loading}>{loading ? 'Updating...' : 'Update Password'}</Button>
                                    </form>
                                ) : null}
                                {isVerifying ? <p className="text-sm text-white/70 mt-4">Verifying your email...</p> : null}
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
