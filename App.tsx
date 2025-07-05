import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { supabaseService } from './lib/supabaseService';
import { getConnectionStatus } from './lib/supabase';
import ErrorBoundary from './components/ErrorBoundary';
import Header from './components/Header';
import { ToastProvider } from './components/ui/Toast';

// Pages
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import AdminPage from './pages/AdminPage';
import CreateFormPage from './pages/CreateFormPage';
import FormViewPage from './pages/FormViewPage';
import FormDetailPage from './pages/FormResponsesPage';
import FormAnalyticsPage from './pages/FormAnalyticsPage';
import AboutPage from './pages/AboutPage';
import FeaturesPage from './pages/FeaturesPage';
import PricingPage from './pages/PricingPage';
import ProfilePage from './pages/ProfilePage';
import ResetPasswordPage from './pages/ResetPasswordPage';

// Components
import ProtectedRoute from './components/auth/ProtectedRoute';
import Loader from './components/Loader';

function App() {
  const { authState, initializeAuth } = useAuthStore();

  useEffect(() => {
    // Initialize authentication
    initializeAuth();
    
    // Verify database connection
    const verifyConnection = async () => {
      try {
        const connected = await supabaseService.verifyConnection();
        if (!connected) {
          // Database connection verification failed
        }
      } catch (error) {
        // Database connection error
      }
    };

    verifyConnection();
    
    // Monitor connection status
    const connectionCheckInterval = setInterval(() => {
      const status = getConnectionStatus();
      if (status === 'error') {
        // Database connection lost, attempting to reconnect
        verifyConnection();
      }
    }, 30000); // Check every 30 seconds

    return () => {
      clearInterval(connectionCheckInterval);
    };
  }, [initializeAuth]);

  if (authState === 'loading') {
    return <Loader />;
  }

  return (
    <ErrorBoundary>
      <ToastProvider>
        <Router>
          <Header />
          <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/features" element={<FeaturesPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              
              {/* Form View Route (Public) */}
              <Route path="/form/:id" element={<FormViewPage />} />
              
              {/* Protected Routes */}
              <Route path="/admin" element={
                <ProtectedRoute>
                  <AdminPage />
                </ProtectedRoute>
              } />
                        <Route path="/admin/form/:id" element={
              <ProtectedRoute>
                <FormDetailPage />
              </ProtectedRoute>
            } />
              <Route path="/create" element={<CreateFormPage />} />
                        <Route path="/form/:id/responses" element={
              <ProtectedRoute>
                <FormDetailPage />
              </ProtectedRoute>
            } />
              <Route path="/form/:id/analytics" element={
                <ProtectedRoute>
                  <FormAnalyticsPage />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } />
              
              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </Router>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;