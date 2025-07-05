import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabaseAuth, AuthCredentials, RegisterCredentials } from '../lib/supabaseAuth';
import { supabase } from '../lib/supabase';

export type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthStore {
  user: User | null;
  session: Session | null;
  authState: AuthState;
  error: string | null;
  
  // Actions
  signIn: (credentials: AuthCredentials) => Promise<void>;
  signUp: (credentials: RegisterCredentials) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUpWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: { displayName?: string; photoURL?: string }) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  clearError: () => void;
  initializeAuth: () => void;
  
  // Helper getters
  isAuthenticated: () => boolean;
  getUserId: () => string | null;
  getDisplayName: () => string | null;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  session: null,
  authState: 'loading',
  error: null,

  signIn: async (credentials) => {
    try {
      set({ error: null, authState: 'loading' });
      
      const { user, session } = await supabaseAuth.signInWithEmailAndPassword(credentials);
      
      set({ 
        user, 
        session, 
        authState: 'authenticated', 
        error: null 
      });
    } catch (error: any) {
      set({ 
        error: error.message, 
        authState: 'unauthenticated', 
        user: null, 
        session: null 
      });
      throw error;
    }
  },

  signUp: async (credentials) => {
    try {
      set({ error: null, authState: 'loading' });
      
      const { user, session } = await supabaseAuth.signUp(credentials);
      
      // Note: user might be null if email confirmation is required
      set({ 
        user, 
        session,
        authState: user ? 'authenticated' : 'unauthenticated', 
        error: null 
      });

      // If email confirmation is required, show a message
      if (!user && !session) {
        set({ 
          error: 'Please check your email and click the confirmation link to complete registration.',
          authState: 'unauthenticated'
        });
      }
    } catch (error: any) {
      set({ 
        error: error.message, 
        authState: 'unauthenticated', 
        user: null, 
        session: null 
      });
      throw error;
    }
  },

  signInWithGoogle: async () => {
    try {
      set({ error: null, authState: 'loading' });
      
      await supabaseAuth.signInWithGoogle();
      
      // The auth state will be updated by the auth listener
      // when the user returns from Google OAuth
    } catch (error: any) {
      set({ 
        error: error.message, 
        authState: 'unauthenticated', 
        user: null, 
        session: null 
      });
      throw error;
    }
  },

  signUpWithGoogle: async () => {
    try {
      set({ error: null, authState: 'loading' });
      
      await supabaseAuth.signUpWithGoogle();
      
      // The auth state will be updated by the auth listener
      // when the user returns from Google OAuth
    } catch (error: any) {
      set({ 
        error: error.message, 
        authState: 'unauthenticated', 
        user: null, 
        session: null 
      });
      throw error;
    }
  },

  signOut: async () => {
    try {
      set({ error: null });
      
      await supabaseAuth.signOut();
      
      set({ 
        user: null, 
        session: null, 
        authState: 'unauthenticated', 
        error: null 
      });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  updateProfile: async (updates) => {
    try {
      set({ error: null });
      
      const updatedUser = await supabaseAuth.updateProfile(updates);
      
      set((state) => ({
        user: updatedUser,
        error: null
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  sendPasswordReset: async (email) => {
    try {
      set({ error: null });
      
      await supabaseAuth.sendPasswordResetEmail(email);
      
      // Success message could be shown in the UI
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },

  initializeAuth: () => {
    // Get initial session
    supabaseAuth.getCurrentSession().then((session) => {
      set({ 
        user: session?.user || null, 
        session, 
        authState: session?.user ? 'authenticated' : 'unauthenticated' 
      });
    });

    // Listen for auth changes
    const { data: { subscription } } = supabaseAuth.onAuthStateChanged((event, session) => {
      set({ 
        user: session?.user || null, 
        session,
        authState: session?.user ? 'authenticated' : 'unauthenticated',
        error: null
      });
    });

    // Return cleanup function
    return () => {
      subscription.unsubscribe();
    };
  },

  // Helper getters
  isAuthenticated: () => {
    const state = get();
    return state.authState === 'authenticated' && !!state.user;
  },

  getUserId: () => {
    const state = get();
    return state.user?.id || null;
  },

  getDisplayName: () => {
    const state = get();
    if (!state.user) return null;
    
    // Try user metadata first, then fall back to email
    const metadata = state.user.user_metadata;
    return metadata?.display_name || 
           metadata?.full_name || 
           state.user.email?.split('@')[0] || 
           'User';
  },
}));

// Initialize auth on store creation
useAuthStore.getState().initializeAuth();

// Export store instance for access from other stores if needed
export const authStore = useAuthStore; 