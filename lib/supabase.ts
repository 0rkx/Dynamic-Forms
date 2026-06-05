import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable. Please check your .env file.');
}

if (!supabasePublishableKey) {
  throw new Error('Missing VITE_SUPABASE_PUBLISHABLE_KEY environment variable. Please check your .env file.');
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch {
  throw new Error('Invalid VITE_SUPABASE_URL format. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storageKey: 'dynamic-forms-auth'
  },
  global: {
    headers: {
      'x-client-info': 'dynamic-forms-app'
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Connection monitoring
let connectionStatus = 'connecting';

supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    connectionStatus = 'connected';
  } else if (event === 'SIGNED_OUT') {
    connectionStatus = 'disconnected';
  }
});

// Test connection on initialization
(async () => {
  try {
    await supabase.from('forms').select('count').limit(1);
    connectionStatus = 'connected';
    console.log('Supabase connection established');
  } catch (error: any) {
    connectionStatus = 'error';
    console.error('Supabase connection failed:', error);
  }
})();

export const getConnectionStatus = () => connectionStatus;

// Export types for TypeScript support
export type { User, Session, AuthError } from '@supabase/supabase-js'; 
