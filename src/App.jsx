import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Toaster } from '@/components/ui/toaster';
import HomePage from '@/pages/HomePage';
import CreateEventPage from '@/pages/CreateEventPage';
import EditEventPage from '@/pages/EditEventPage';
import EventDetailsPage from '@/pages/EventDetailsPage';
import CheckoutPage from '@/pages/CheckoutPage';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SeatSelectionPage from '@/pages/SeatSelectionPage';
import VirtualEventPage from '@/pages/VirtualEventPage';
import DashboardPage from '@/pages/DashboardPage';
import ProfilePage from '@/pages/ProfilePage';
import IntegrationsPage from '@/pages/IntegrationsPage';
import SuperAdminLoginPage from '@/pages/SuperAdminLoginPage';
import SuperAdminDashboardPage from '@/pages/SuperAdminDashboardPage';
import SuperAdminProtectedRoute from '@/components/SuperAdminProtectedRoute';
import AdminUserManagementPage from '@/pages/admin/UserManagementPage';
import AdminEventManagementPage from '@/pages/admin/EventManagementPage';
import AdminSettingsPage from '@/pages/admin/SettingsPage';
import ProtectedRoute from '@/components/ProtectedRoute';
import RoleBasedProtectedRoute from '@/components/RoleBasedProtectedRoute';
import AuthPage from '@/pages/AuthPage';
import { AuthProvider } from '@/context/SupabaseAuthContext';
import MessagesPage from '@/pages/MessagesPage';
import PaymentSuccessPage from '@/pages/PaymentSuccessPage';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import BankTransferPendingPage from '@/pages/BankTransferPendingPage';
import PaymentManagementPage from '@/pages/PaymentManagementPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import NotificationsPage from '@/pages/NotificationsPage';
import HostDashboardPage from '@/pages/HostDashboardPage';
import ManageAttendeesPage from '@/pages/ManageAttendeesPage';
import TermsAndConditionsPage from '@/pages/TermsAndConditionsPage';

const AppContent = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/super-admin');

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      <div className="floating-shapes">
        <div className="shape"></div>
        <div className="shape"></div>
        <div className="shape"></div>
      </div>
      
      {!isAdminRoute && <Navbar />}
      
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/terms" element={<TermsAndConditionsPage />} />
          <Route 
            path="/create-event" 
            element={
              <RoleBasedProtectedRoute allowedRoles={['Event Organizer', 'Super Admin']}>
                <CreateEventPage />
              </RoleBasedProtectedRoute>
            } 
          />
          <Route 
            path="/edit-event/:id" 
            element={
              <RoleBasedProtectedRoute allowedRoles={['Event Organizer', 'Super Admin']}>
                <EditEventPage />
              </RoleBasedProtectedRoute>
            } 
          />
          <Route 
            path="/host/:eventId" 
            element={
              <RoleBasedProtectedRoute allowedRoles={['Event Organizer', 'Super Admin', 'Speaker']}>
                <HostDashboardPage />
              </RoleBasedProtectedRoute>
            } 
          />
           <Route 
            path="/host/:eventId/attendees" 
            element={
              <RoleBasedProtectedRoute allowedRoles={['Event Organizer', 'Super Admin']}>
                <ManageAttendeesPage />
              </RoleBasedProtectedRoute>
            } 
          />
          <Route path="/event/:id" element={<EventDetailsPage />} />
          <Route path="/select-seats/:eventId" element={<ProtectedRoute><SeatSelectionPage /></ProtectedRoute>} />
          <Route path="/checkout/:eventId" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
          <Route path="/live/:eventId" element={<ProtectedRoute><VirtualEventPage /></ProtectedRoute>} />
          <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccessPage /></ProtectedRoute>} />
          <Route path="/bank-transfer-pending" element={<ProtectedRoute><BankTransferPendingPage /></ProtectedRoute>} />
          
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/integrations" 
            element={
              <ProtectedRoute>
                <IntegrationsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/messages" 
            element={
              <ProtectedRoute>
                <MessagesPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/notifications" 
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/manage-payments" 
            element={
              <RoleBasedProtectedRoute allowedRoles={['Event Organizer', 'Super Admin']}>
                <PaymentManagementPage />
              </RoleBasedProtectedRoute>
            } 
          />
          <Route 
            path="/analytics" 
            element={
              <RoleBasedProtectedRoute allowedRoles={['Event Organizer', 'Super Admin']}>
                <AnalyticsPage />
              </RoleBasedProtectedRoute>
            } 
          />

          <Route path="/super-admin/login" element={<SuperAdminLoginPage />} />
          <Route 
            path="/super-admin/dashboard" 
            element={
              <SuperAdminProtectedRoute>
                <SuperAdminDashboardPage />
              </SuperAdminProtectedRoute>
            } 
          />
          <Route 
            path="/super-admin/users" 
            element={
              <SuperAdminProtectedRoute>
                <AdminUserManagementPage />
              </SuperAdminProtectedRoute>
            } 
          />
          <Route 
            path="/super-admin/events" 
            element={
              <SuperAdminProtectedRoute>
                <AdminEventManagementPage />
              </SuperAdminProtectedRoute>
            } 
          />
          <Route 
            path="/super-admin/settings" 
            element={
              <SuperAdminProtectedRoute>
                <AdminSettingsPage />
              </SuperAdminProtectedRoute>
            } 
          />
        </Routes>
      </main>
      
      {!isAdminRoute && <Footer />}
      
      <Toaster />
    </div>
  );
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');


function App() {
  return (
    <Router>
      <AuthProvider>
        <Elements stripe={stripePromise}>
          <Helmet>
            <title>EventHost - Create & Discover Amazing Events</title>
            <meta name="description" content="The ultimate platform to create, discover, and attend incredible events. Join thousands of event organizers and attendees worldwide." />
          </Helmet>
          <AppContent />
        </Elements>
      </AuthProvider>
    </Router>
  );
}

export default App;
