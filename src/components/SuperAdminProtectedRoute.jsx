import React from 'react';
import { Navigate } from 'react-router-dom';

const SuperAdminProtectedRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem('super_admin_token');

  if (!isAuthenticated) {
    return <Navigate to="/super-admin/login" replace />;
  }

  return children;
};

export default SuperAdminProtectedRoute;