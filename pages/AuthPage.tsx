import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useFormStore } from '../store/formStore';
import LoginForm from '../components/auth/LoginForm';
import RegisterForm from '../components/auth/RegisterForm';
import ForgotPasswordForm from '../components/auth/ForgotPasswordForm';

type AuthMode = 'login' | 'register' | 'forgot-password';

const AuthPage: React.FC = () => {
  const { user, authState } = useAuthStore();
  const { pendingForm, addForm, setPendingForm } = useFormStore();
  const [mode, setMode] = useState<AuthMode>('login');
  const [isOAuthCallback, setIsOAuthCallback] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if this is an OAuth callback (URL contains access_token or code)
    const urlParams = new URLSearchParams(location.hash.substring(1));
    const hasAccessToken = urlParams.has('access_token');
    const hasCode = urlParams.has('code');
    
    if (hasAccessToken || hasCode) {
      setIsOAuthCallback(true);
    }
  }, [location.hash]);

  useEffect(() => {
    if (authState === 'authenticated' && user) {
      if (pendingForm) {
        navigate('/create');
      } else {
        const from = (location.state as any)?.from?.pathname || '/';
        navigate(from, { replace: true });
      }
    }
  }, [authState, user, pendingForm, navigate, location.state]);

  if (authState === 'authenticated' && user) {
    return null; // or a loader, while useEffect runs
  }

  // Show loading state if this is an OAuth callback
  if (isOAuthCallback && authState === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dynamic Forms</h1>
            <p className="text-gray-600">Completing your Google sign-in...</p>
          </div>
        </div>
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-6 shadow rounded-lg sm:px-10">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderForm = () => {
    switch (mode) {
      case 'login':
        return (
          <LoginForm
            onSwitchToRegister={() => setMode('register')}
            onForgotPassword={() => setMode('forgot-password')}
          />
        );
      case 'register':
        return (
          <RegisterForm
            onSwitchToLogin={() => setMode('login')}
          />
        );
      case 'forgot-password':
        return (
          <ForgotPasswordForm
            onBack={() => setMode('login')}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dynamic Forms</h1>
          <p className="text-gray-600">Create and manage beautiful forms with ease</p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {renderForm()}
      </div>
    </div>
  );
};

export default AuthPage; 