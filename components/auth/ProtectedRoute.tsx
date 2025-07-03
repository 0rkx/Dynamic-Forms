import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import Loader from '../Loader';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, authState } = useAuthStore();
  const location = useLocation();

  // Show loading state while determining auth status
  if (authState === 'loading') {
    return <Loader />;
  }

  // Redirect to login if not authenticated
  if (authState === 'unauthenticated' || !user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Render children if authenticated
  return <>{children}</>;
};

export default ProtectedRoute; 