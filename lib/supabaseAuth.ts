import { supabase } from './supabase';
import { User, Session, AuthError } from '@supabase/supabase-js';

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends AuthCredentials {
  displayName?: string;
}

export class SupabaseAuthService {
  /**
   * Sign up a new user with email and password
   */
  async signUp(credentials: RegisterCredentials): Promise<{ user: User | null; session: Session | null }> {
    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: {
          display_name: credentials.displayName || credentials.email.split('@')[0],
        }
      }
    });

    if (error) {
      throw this.formatAuthError(error);
    }

    return data;
  }

  /**
   * Sign in with email and password
   */
  async signInWithEmailAndPassword(credentials: AuthCredentials): Promise<{ user: User; session: Session }> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password
    });

    if (error) {
      throw this.formatAuthError(error);
    }

    if (!data.user || !data.session) {
      throw new Error('Authentication failed');
    }

    return { user: data.user, session: data.session };
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw this.formatAuthError(error);
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });

    if (error) {
      throw this.formatAuthError(error);
    }
  }

  /**
   * Update user profile information
   */
  async updateProfile(updates: { displayName?: string; photoURL?: string }): Promise<User> {
    const updateData: any = {};
    
    if (updates.displayName) {
      updateData.data = { display_name: updates.displayName };
    }

    const { data, error } = await supabase.auth.updateUser(updateData);

    if (error) {
      throw this.formatAuthError(error);
    }

    if (!data.user) {
      throw new Error('Failed to update profile');
    }

    return data.user;
  }

  /**
   * Get the current user
   */
  async getCurrentUser(): Promise<User | null> {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error getting current user:', error);
      return null;
    }

    return user;
  }

  /**
   * Get the current session
   */
  async getCurrentSession(): Promise<Session | null> {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting current session:', error);
      return null;
    }

    return session;
  }

  /**
   * Listen for authentication state changes
   */
  onAuthStateChanged(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }

  /**
   * Check if email is confirmed
   */
  async isEmailConfirmed(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user?.email_confirmed_at != null;
  }

  /**
   * Resend email confirmation
   */
  async resendConfirmation(email: string): Promise<void> {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email
    });

    if (error) {
      throw this.formatAuthError(error);
    }
  }

  /**
   * Format Supabase auth errors to match the existing error format
   */
  private formatAuthError(error: AuthError): Error {
    const errorMap: Record<string, string> = {
      'invalid_credentials': 'Invalid email or password.',
      'email_not_confirmed': 'Please check your email and click the confirmation link.',
      'signup_disabled': 'User registration is currently disabled.',
      'user_not_found': 'No user found with this email address.',
      'invalid_email': 'Invalid email address.',
      'weak_password': 'Password should be at least 6 characters.',
      'email_already_registered': 'An account with this email already exists.',
      'too_many_requests': 'Too many requests. Please wait a moment and try again.'
    };

    const message = errorMap[error.message] || error.message || 'An authentication error occurred.';
    
    const formattedError = new Error(message);
    (formattedError as any).code = error.message;
    
    return formattedError;
  }
}

// Export singleton instance
export const supabaseAuth = new SupabaseAuthService(); 