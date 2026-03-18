import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { backendClient } from '@/lib/backendClient';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) return null;
    const { data, error } = await backendClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data;
  }, []);

  const handleRedirect = (userProfile) => {
    if (!userProfile) return;
    navigate('/dashboard');
  };

  const handleSession = useCallback(async (currentSession, event) => {
    setLoading(true);
    setSession(currentSession);
    if (currentSession?.user) {
      setUser(currentSession.user);
      const userProfile = await fetchProfile(currentSession.user.id);
      setProfile(userProfile);
      
      if (event === 'SIGNED_IN') {
        handleRedirect(userProfile);
      }
    } else {
      setUser(null);
      setProfile(null);
    }
    setLoading(false);
  }, [fetchProfile, navigate]);
  
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await backendClient.auth.getSession();
      await handleSession(session, null);
    };

    getSession();

    const { data: { subscription } } = backendClient.auth.onAuthStateChange(
      async (event, session) => {
        await handleSession(session, event);
        if (event === 'PASSWORD_RECOVERY') {
          navigate('/profile');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [handleSession, navigate]);


  const signUp = useCallback(async (email, password, options) => {
    const { error } = await backendClient.auth.signUp({
      email,
      password,
      options,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign up Failed",
        description: error.message || "Something went wrong",
      });
    }

    return { error };
  }, [toast]);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await backendClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign in Failed",
        description: error.message || "Something went wrong",
      });
    }

    return { data, error };
  }, [toast]);

  const signOut = useCallback(async () => {
    const { error } = await backendClient.auth.signOut();
    navigate('/');
    if (error) {
      toast({
        variant: "destructive",
        title: "Sign out Failed",
        description: error.message || "Something went wrong",
      });
    }

    return { error };
  }, [toast, navigate]);
  
  const updateProfile = (newProfile) => {
    setProfile(newProfile);
  };

  const updatePassword = useCallback(async (password) => {
    const { error } = await backendClient.auth.updateUser({ password });
    if (error) {
      toast({
        variant: "destructive",
        title: "Password Update Failed",
        description: error.message,
      });
    } else {
      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully.",
      });
    }
    return { error };
  }, [toast]);

  const value = useMemo(() => ({
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    fetchProfile,
    updateProfile,
    updatePassword,
  }), [user, profile, session, loading, signUp, signIn, signOut, fetchProfile, updatePassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a AuthProvider');
  }
  return context;
};