import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { RegisterCredentials } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const { signUp, error, authState, clearError } = useAuthStore();
  const [credentials, setCredentials] = useState<RegisterCredentials>({
    email: '',
    password: '',
    displayName: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    if (credentials.password !== confirmPassword) {
      return;
    }

    try {
      await signUp(credentials);
    } catch (error) {
      // Error is handled by the store
    }
  };

  const handleChange = (field: keyof RegisterCredentials) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const isLoading = authState === 'loading';
  const passwordMismatch = confirmPassword && credentials.password !== confirmPassword;

  return (
    <Card className="w-full max-w-md mx-auto">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">
          Create Account
        </h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {passwordMismatch && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">Passwords do not match</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
              Display Name
            </label>
            <Input
              id="displayName"
              type="text"
              value={credentials.displayName || ''}
              onChange={handleChange('displayName')}
              placeholder="Enter your display name"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              value={credentials.email}
              onChange={handleChange('email')}
              placeholder="Enter your email"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={credentials.password}
              onChange={handleChange('password')}
              placeholder="Enter your password (min 6 characters)"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
                         <Input
               id="confirmPassword"
               type="password"
               value={confirmPassword}
               onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
               placeholder="Confirm your password"
               required
               disabled={isLoading}
             />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={
              isLoading || 
              !credentials.email || 
              !credentials.password || 
              !confirmPassword ||
              passwordMismatch ||
              credentials.password.length < 6
            }
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <span className="text-sm text-gray-600">Already have an account? </span>
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
            disabled={isLoading}
          >
            Sign in
          </button>
        </div>
      </div>
    </Card>
  );
};

export default RegisterForm; 