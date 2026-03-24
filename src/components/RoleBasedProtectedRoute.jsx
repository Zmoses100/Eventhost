import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

const RoleBasedProtectedRoute = ({ children, allowedRoles }) => {
  const { profile, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!user) {
    toast({
      title: 'Authentication Required',
      description: 'You need to be logged in to view this page.',
      variant: 'destructive',
    });
    return <Navigate to="/auth" replace />;
  }

  if (profile?.role === 'Super Admin') {
    return children;
  }

  if (!profile || !allowedRoles.includes(profile.role)) {
    toast({
      title: 'Access Denied',
      description: "You don't have permission to access this page.",
      variant: 'destructive',
    });
    
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default RoleBasedProtectedRoute;