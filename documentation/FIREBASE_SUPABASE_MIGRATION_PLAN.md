# Firebase Auth + Supabase Migration Plan

## Current Architecture Analysis

### Current Authentication System
- **Mock Authentication** (`lib/mockAuth.ts`) simulating Firebase Auth API
- **Client-side Storage** via localStorage for user data
- **Zustand Store** (`store/authStore.ts`) for state management
- No real backend authentication

### Current Data Storage
- **Frontend**: localStorage-based persistence via Zustand
- **Backend**: Flask API only for AI features (Gemini integration)
- **Data Types**: Forms, Responses, User profiles, Analysis caches
- **Total Storage**: All client-side via localStorage

---

## Target Architecture

### Authentication: Firebase Auth
- Real Firebase Authentication with email/password
- Secure user management and session handling
- Support for additional auth providers (Google, GitHub, etc.)

### Database: Supabase PostgreSQL
- Centralized data storage replacing localStorage
- Real-time subscriptions for collaborative features
- Row Level Security (RLS) for data protection
- Structured relational data with proper schemas

---

## Migration Strategy Overview

### Phase 1: Setup & Configuration (2-3 days)
1. Firebase project setup and configuration
2. Supabase project setup and database schema design
3. Environment configuration and security setup

### Phase 2: Database Migration (3-4 days)
1. Design and create Supabase database schema
2. Create migration scripts for existing localStorage data
3. Implement Supabase client and data access layer

### Phase 3: Authentication Migration (2-3 days)
1. Replace mock auth with Firebase Auth
2. Update authentication store and components
3. Implement proper session management

### Phase 4: Frontend Integration (3-4 days)
1. Replace localStorage calls with Supabase queries
2. Update stores to use database operations
3. Implement real-time features

### Phase 5: Testing & Deployment (2-3 days)
1. Comprehensive testing of all features
2. Data migration validation
3. Performance optimization and deployment

**Total Estimated Time: 12-17 days**

---

## Detailed Migration Steps

## Phase 1: Setup & Configuration

### 1.1 Firebase Setup
```bash
# Install Firebase SDK
npm install firebase

# Create Firebase project and enable Authentication
# Enable Email/Password authentication in Firebase Console
```

#### Firebase Configuration
```typescript
// lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

### 1.2 Supabase Setup
```bash
# Install Supabase client
npm install @supabase/supabase-js

# Create Supabase project and get credentials
```

#### Supabase Configuration
```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### 1.3 Environment Variables
```env
# .env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

VITE_SUPABASE_URL=https://your_project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

---

## Phase 2: Database Schema Design

### 2.1 Supabase Database Schema

#### Users Table (Linked to Firebase Auth)
```sql
-- users table (synced with Firebase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  photo_url TEXT,
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (firebase_uid = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (firebase_uid = auth.jwt() ->> 'sub');
```

#### Forms Table
```sql
-- forms table
CREATE TABLE forms (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  manifesto TEXT,
  questions JSONB NOT NULL,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  views INTEGER DEFAULT 0,
  intelligent_follow_ups BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_forms_owner_id ON forms(owner_id);
CREATE INDEX idx_forms_created_at ON forms(created_at);

-- RLS policies
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own forms" ON forms
  FOR SELECT USING (owner_id IN (
    SELECT id FROM users WHERE firebase_uid = auth.jwt() ->> 'sub'
  ));

CREATE POLICY "Users can create forms" ON forms
  FOR INSERT WITH CHECK (owner_id IN (
    SELECT id FROM users WHERE firebase_uid = auth.jwt() ->> 'sub'
  ));

CREATE POLICY "Users can update own forms" ON forms
  FOR UPDATE USING (owner_id IN (
    SELECT id FROM users WHERE firebase_uid = auth.jwt() ->> 'sub'
  ));

CREATE POLICY "Users can delete own forms" ON forms
  FOR DELETE USING (owner_id IN (
    SELECT id FROM users WHERE firebase_uid = auth.jwt() ->> 'sub'
  ));
```

#### Form Responses Table
```sql
-- form_responses table
CREATE TABLE form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id TEXT REFERENCES forms(id) ON DELETE CASCADE,
  response_id TEXT UNIQUE NOT NULL,
  answers JSONB NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Indexes
CREATE INDEX idx_responses_form_id ON form_responses(form_id);
CREATE INDEX idx_responses_submitted_at ON form_responses(submitted_at);

-- RLS policies
ALTER TABLE form_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Form owners can view responses" ON form_responses
  FOR SELECT USING (form_id IN (
    SELECT id FROM forms WHERE owner_id IN (
      SELECT id FROM users WHERE firebase_uid = auth.jwt() ->> 'sub'
    )
  ));

-- Public can insert responses (for anonymous form submissions)
CREATE POLICY "Anyone can submit responses" ON form_responses
  FOR INSERT WITH CHECK (true);
```

#### Analytics Cache Table
```sql
-- analytics_cache table (replacing localStorage caching)
CREATE TABLE analytics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  cache_data JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for cache key lookups
CREATE INDEX idx_analytics_cache_key ON analytics_cache(cache_key);
CREATE INDEX idx_analytics_cache_expires ON analytics_cache(expires_at);

-- Cleanup function for expired cache
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM analytics_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (run hourly)
SELECT cron.schedule('cleanup-cache', '0 * * * *', 'SELECT cleanup_expired_cache();');
```

### 2.2 Migration Functions
```sql
-- Function to sync Firebase user to Supabase
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO users (firebase_uid, email, display_name, email_verified)
  VALUES (
    NEW.firebase_uid,
    NEW.email,
    NEW.display_name,
    NEW.email_verified
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Phase 3: Authentication Migration

### 3.1 Replace Mock Auth Service

#### New Firebase Auth Service
```typescript
// lib/firebaseAuth.ts
import {
  signInWithEmailAndPassword as firebaseSignIn,
  createUserWithEmailAndPassword as firebaseSignUp,
  signOut as firebaseSignOut,
  updateProfile as firebaseUpdateProfile,
  sendPasswordResetEmail as firebaseSendPasswordReset,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from './firebase';
import { supabase } from './supabase';

export class FirebaseAuthService {
  async signInWithEmailAndPassword(email: string, password: string) {
    const result = await firebaseSignIn(auth, email, password);
    await this.syncUserToSupabase(result.user);
    return result;
  }

  async createUserWithEmailAndPassword(email: string, password: string, displayName?: string) {
    const result = await firebaseSignUp(auth, email, password);
    
    if (displayName) {
      await firebaseUpdateProfile(result.user, { displayName });
    }
    
    await this.syncUserToSupabase(result.user);
    return result;
  }

  async signOut() {
    return firebaseSignOut(auth);
  }

  async updateProfile(updates: { displayName?: string; photoURL?: string }) {
    if (!auth.currentUser) throw new Error('No user signed in');
    
    await firebaseUpdateProfile(auth.currentUser, updates);
    await this.syncUserToSupabase(auth.currentUser);
  }

  async sendPasswordResetEmail(email: string) {
    return firebaseSendPasswordReset(auth, email);
  }

  onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  }

  getCurrentUser() {
    return auth.currentUser;
  }

  private async syncUserToSupabase(user: FirebaseUser) {
    const { error } = await supabase
      .from('users')
      .upsert({
        firebase_uid: user.uid,
        email: user.email!,
        display_name: user.displayName,
        photo_url: user.photoURL,
        email_verified: user.emailVerified,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'firebase_uid'
      });

    if (error) {
      console.error('Error syncing user to Supabase:', error);
    }
  }
}

export const firebaseAuth = new FirebaseAuthService();
```

### 3.2 Update Auth Store
```typescript
// store/authStore.ts (Updated)
import { create } from 'zustand';
import { User as FirebaseUser } from 'firebase/auth';
import { firebaseAuth } from '../lib/firebaseAuth';
import { supabase } from '../lib/supabase';

interface AuthStore {
  user: FirebaseUser | null;
  supabaseUser: any | null;
  authState: 'loading' | 'authenticated' | 'unauthenticated';
  error: string | null;
  
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: { displayName?: string; photoURL?: string }) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  clearError: () => void;
  initializeAuth: () => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  supabaseUser: null,
  authState: 'loading',
  error: null,

  signIn: async (email, password) => {
    try {
      set({ error: null, authState: 'loading' });
      await firebaseAuth.signInWithEmailAndPassword(email, password);
    } catch (error: any) {
      set({ error: error.message, authState: 'unauthenticated' });
      throw error;
    }
  },

  signUp: async (email, password, displayName) => {
    try {
      set({ error: null, authState: 'loading' });
      await firebaseAuth.createUserWithEmailAndPassword(email, password, displayName);
    } catch (error: any) {
      set({ error: error.message, authState: 'unauthenticated' });
      throw error;
    }
  },

  signOut: async () => {
    try {
      set({ error: null });
      await firebaseAuth.signOut();
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  updateProfile: async (updates) => {
    try {
      set({ error: null });
      await firebaseAuth.updateProfile(updates);
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  sendPasswordReset: async (email) => {
    try {
      set({ error: null });
      await firebaseAuth.sendPasswordResetEmail(email);
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  clearError: () => set({ error: null }),

  initializeAuth: () => {
    return firebaseAuth.onAuthStateChanged(async (user) => {
      if (user) {
        // Get Supabase user data
        const { data: supabaseUser } = await supabase
          .from('users')
          .select('*')
          .eq('firebase_uid', user.uid)
          .single();

        set({ 
          user, 
          supabaseUser,
          authState: 'authenticated',
          error: null 
        });
      } else {
        set({ 
          user: null, 
          supabaseUser: null,
          authState: 'unauthenticated',
          error: null 
        });
      }
    });
  },
}));
```

---

## Phase 4: Data Layer Migration

### 4.1 Supabase Data Service
```typescript
// lib/supabaseService.ts
import { supabase } from './supabase';
import { FormSchema, FormResponse } from '../types';

export class SupabaseService {
  // Forms
  async getForms(userId: string): Promise<FormSchema[]> {
    const { data, error } = await supabase
      .from('forms')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getFormById(formId: string): Promise<FormSchema | null> {
    const { data, error } = await supabase
      .from('forms')
      .select('*')
      .eq('id', formId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  }

  async createForm(form: Omit<FormSchema, 'views' | 'createdAt' | 'updatedAt'>, ownerId: string): Promise<FormSchema> {
    const { data, error } = await supabase
      .from('forms')
      .insert({
        id: form.id,
        title: form.title,
        description: form.description,
        manifesto: form.manifesto,
        questions: form.questions,
        owner_id: ownerId,
        intelligent_follow_ups: form.intelligentFollowUps || false
      })
      .select()
      .single();

    if (error) throw error;
    return this.transformFormFromDB(data);
  }

  async updateForm(formId: string, updates: Partial<FormSchema>): Promise<void> {
    const { error } = await supabase
      .from('forms')
      .update({
        title: updates.title,
        description: updates.description,
        manifesto: updates.manifesto,
        questions: updates.questions,
        intelligent_follow_ups: updates.intelligentFollowUps,
        updated_at: new Date().toISOString()
      })
      .eq('id', formId);

    if (error) throw error;
  }

  async deleteForm(formId: string): Promise<void> {
    const { error } = await supabase
      .from('forms')
      .delete()
      .eq('id', formId);

    if (error) throw error;
  }

  async incrementFormViews(formId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_form_views', {
      form_id: formId
    });

    if (error) throw error;
  }

  // Responses
  async getFormResponses(formId: string): Promise<FormResponse[]> {
    const { data, error } = await supabase
      .from('form_responses')
      .select('*')
      .eq('form_id', formId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(this.transformResponseFromDB);
  }

  async submitResponse(response: Omit<FormResponse, 'responseId' | 'submittedAt'>): Promise<void> {
    const { error } = await supabase
      .from('form_responses')
      .insert({
        form_id: response.formId,
        response_id: `resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        answers: response.answers,
        started_at: response.startedAt,
        submitted_at: new Date().toISOString()
      });

    if (error) throw error;
  }

  // Analytics Cache
  async getAnalysisCache(cacheKey: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('analytics_cache')
      .select('cache_data')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data?.cache_data;
  }

  async setAnalysisCache(cacheKey: string, data: any, ttlHours: number = 2): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + ttlHours);

    const { error } = await supabase
      .from('analytics_cache')
      .upsert({
        cache_key: cacheKey,
        cache_data: data,
        expires_at: expiresAt.toISOString()
      }, {
        onConflict: 'cache_key'
      });

    if (error) throw error;
  }

  // Helper methods
  private transformFormFromDB(dbForm: any): FormSchema {
    return {
      id: dbForm.id,
      title: dbForm.title,
      description: dbForm.description,
      manifesto: dbForm.manifesto,
      questions: dbForm.questions,
      views: dbForm.views || 0,
      intelligentFollowUps: dbForm.intelligent_follow_ups,
      ownerId: dbForm.owner_id,
      createdAt: dbForm.created_at,
      updatedAt: dbForm.updated_at
    };
  }

  private transformResponseFromDB(dbResponse: any): FormResponse {
    return {
      formId: dbResponse.form_id,
      responseId: dbResponse.response_id,
      answers: dbResponse.answers,
      startedAt: dbResponse.started_at,
      submittedAt: dbResponse.submitted_at
    };
  }
}

export const supabaseService = new SupabaseService();
```

### 4.2 Update Form Store
```typescript
// store/formStore.ts (Updated to use Supabase)
import { create } from 'zustand';
import { FormSchema, FormResponse, FormAnalysis } from '../types';
import { supabaseService } from '../lib/supabaseService';
import { useAuthStore } from './authStore';

interface FormState {
  forms: FormSchema[];
  responses: Record<string, FormResponse[]>;
  pendingForm: FormSchema | null;
  analyses: Record<string, FormAnalysis | null>;
  analysisLoading: Record<string, boolean>;
  loading: boolean;
  
  // Actions
  loadForms: () => Promise<void>;
  addForm: (form: Omit<FormSchema, 'createdAt' | 'updatedAt' | 'views' | 'ownerId'>) => Promise<void>;
  getFormById: (id: string) => Promise<FormSchema | undefined>;
  updateForm: (formId: string, updates: Partial<FormSchema>) => Promise<void>;
  deleteForm: (formId: string) => Promise<void>;
  addFormView: (formId: string) => Promise<void>;
  duplicateForm: (formId: string) => Promise<FormSchema | undefined>;
  addResponse: (response: Omit<FormResponse, 'responseId' | 'submittedAt'>) => Promise<void>;
  loadFormResponses: (formId: string) => Promise<void>;
  setPendingForm: (form: FormSchema | null) => void;
  // ... other methods
}

export const useFormStore = create<FormState>((set, get) => ({
  forms: [],
  responses: {},
  pendingForm: null,
  analyses: {},
  analysisLoading: {},
  loading: false,

  loadForms: async () => {
    const { supabaseUser } = useAuthStore.getState();
    if (!supabaseUser) return;

    try {
      set({ loading: true });
      const forms = await supabaseService.getForms(supabaseUser.id);
      set({ forms, loading: false });
    } catch (error) {
      console.error('Error loading forms:', error);
      set({ loading: false });
    }
  },

  addForm: async (form) => {
    const { supabaseUser } = useAuthStore.getState();
    if (!supabaseUser) throw new Error('User not authenticated');

    try {
      const newForm = await supabaseService.createForm(form, supabaseUser.id);
      set((state) => ({
        forms: [newForm, ...state.forms]
      }));
    } catch (error) {
      console.error('Error creating form:', error);
      throw error;
    }
  },

  getFormById: async (id) => {
    try {
      return await supabaseService.getFormById(id);
    } catch (error) {
      console.error('Error fetching form:', error);
      return undefined;
    }
  },

  updateForm: async (formId, updates) => {
    try {
      await supabaseService.updateForm(formId, updates);
      set((state) => ({
        forms: state.forms.map(form =>
          form.id === formId
            ? { ...form, ...updates, updatedAt: new Date().toISOString() }
            : form
        )
      }));
    } catch (error) {
      console.error('Error updating form:', error);
      throw error;
    }
  },

  deleteForm: async (formId) => {
    try {
      await supabaseService.deleteForm(formId);
      set((state) => ({
        forms: state.forms.filter(form => form.id !== formId),
        responses: { ...state.responses, [formId]: undefined }
      }));
    } catch (error) {
      console.error('Error deleting form:', error);
      throw error;
    }
  },

  addFormView: async (formId) => {
    try {
      await supabaseService.incrementFormViews(formId);
      set((state) => ({
        forms: state.forms.map(form =>
          form.id === formId
            ? { ...form, views: form.views + 1 }
            : form
        )
      }));
    } catch (error) {
      console.error('Error incrementing form views:', error);
    }
  },

  addResponse: async (response) => {
    try {
      await supabaseService.submitResponse(response);
      // Optionally reload responses or update local state
    } catch (error) {
      console.error('Error submitting response:', error);
      throw error;
    }
  },

  loadFormResponses: async (formId) => {
    try {
      const responses = await supabaseService.getFormResponses(formId);
      set((state) => ({
        responses: { ...state.responses, [formId]: responses }
      }));
    } catch (error) {
      console.error('Error loading form responses:', error);
      throw error;
    }
  },

  setPendingForm: (form) => set({ pendingForm: form }),

  // ... implement other methods using supabaseService
}));
```

---

## Phase 5: Data Migration Script

### 5.1 LocalStorage to Supabase Migration
```typescript
// scripts/migrateData.ts
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

interface LocalStorageData {
  forms: any[];
  responses: Record<string, any[]>;
  users: any[];
  currentUser: any;
}

export async function migrateLocalStorageData(): Promise<void> {
  try {
    console.log('Starting data migration...');

    // Extract data from localStorage
    const data = extractLocalStorageData();
    
    if (!data) {
      console.log('No data found to migrate');
      return;
    }

    // Migrate users first
    await migrateUsers(data.users, data.currentUser);
    
    // Migrate forms
    await migrateForms(data.forms);
    
    // Migrate responses
    await migrateResponses(data.responses);
    
    console.log('Migration completed successfully');
    
    // Optionally clear localStorage after successful migration
    if (confirm('Migration successful! Clear old localStorage data?')) {
      clearLocalStorageData();
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

function extractLocalStorageData(): LocalStorageData | null {
  try {
    // Extract Zustand persisted data
    const formsData = localStorage.getItem('dynamic-forms-storage');
    const usersData = localStorage.getItem('mock-auth-users');
    const currentUserData = localStorage.getItem('mock-current-user');
    
    if (!formsData) return null;
    
    const parsedFormsData = JSON.parse(formsData);
    const users = usersData ? JSON.parse(usersData) : [];
    const currentUser = currentUserData ? JSON.parse(currentUserData) : null;
    
    return {
      forms: parsedFormsData.state?.forms || [],
      responses: parsedFormsData.state?.responses || {},
      users,
      currentUser
    };
  } catch (error) {
    console.error('Error extracting localStorage data:', error);
    return null;
  }
}

async function migrateUsers(users: any[], currentUser: any): Promise<void> {
  console.log(`Migrating ${users.length} users...`);
  
  for (const user of users) {
    try {
      const { error } = await supabase
        .from('users')
        .upsert({
          firebase_uid: user.uid,
          email: user.email,
          display_name: user.displayName,
          photo_url: user.photoURL,
          email_verified: user.emailVerified || false,
          created_at: user.createdAt || new Date().toISOString()
        }, {
          onConflict: 'firebase_uid'
        });
      
      if (error) {
        console.error(`Error migrating user ${user.email}:`, error);
      } else {
        console.log(`Migrated user: ${user.email}`);
      }
    } catch (error) {
      console.error(`Failed to migrate user ${user.email}:`, error);
    }
  }
}

async function migrateForms(forms: any[]): Promise<void> {
  console.log(`Migrating ${forms.length} forms...`);
  
  const { supabaseUser } = useAuthStore.getState();
  if (!supabaseUser) {
    throw new Error('No authenticated user for form migration');
  }
  
  for (const form of forms) {
    try {
      const { error } = await supabase
        .from('forms')
        .upsert({
          id: form.id,
          title: form.title,
          description: form.description,
          manifesto: form.manifesto,
          questions: form.questions,
          owner_id: supabaseUser.id,
          views: form.views || 0,
          intelligent_follow_ups: form.intelligentFollowUps || false,
          created_at: form.createdAt || new Date().toISOString(),
          updated_at: form.updatedAt || new Date().toISOString()
        }, {
          onConflict: 'id'
        });
      
      if (error) {
        console.error(`Error migrating form ${form.title}:`, error);
      } else {
        console.log(`Migrated form: ${form.title}`);
      }
    } catch (error) {
      console.error(`Failed to migrate form ${form.title}:`, error);
    }
  }
}

async function migrateResponses(responsesMap: Record<string, any[]>): Promise<void> {
  let totalResponses = 0;
  for (const responses of Object.values(responsesMap)) {
    totalResponses += responses.length;
  }
  
  console.log(`Migrating ${totalResponses} responses...`);
  
  for (const [formId, responses] of Object.entries(responsesMap)) {
    for (const response of responses) {
      try {
        const { error } = await supabase
          .from('form_responses')
          .upsert({
            form_id: formId,
            response_id: response.responseId,
            answers: response.answers,
            started_at: response.startedAt,
            submitted_at: response.submittedAt
          }, {
            onConflict: 'response_id'
          });
        
        if (error) {
          console.error(`Error migrating response ${response.responseId}:`, error);
        } else {
          console.log(`Migrated response: ${response.responseId}`);
        }
      } catch (error) {
        console.error(`Failed to migrate response ${response.responseId}:`, error);
      }
    }
  }
}

function clearLocalStorageData(): void {
  const keysToRemove = [
    'dynamic-forms-storage',
    'mock-auth-users',
    'mock-current-user'
  ];
  
  // Also remove analysis cache keys
  const allKeys = Object.keys(localStorage);
  const cacheKeys = allKeys.filter(key => 
    key.includes('_analysis_') || 
    key.includes('bulk_analysis_') ||
    key.includes('shared_form_')
  );
  
  [...keysToRemove, ...cacheKeys].forEach(key => {
    localStorage.removeItem(key);
  });
  
  console.log('Cleared localStorage data');
}
```

---

## Phase 6: Component Updates

### 6.1 Update Auth Components
Most auth components won't need major changes since they already use the auth store, but ensure they handle the new authentication flow properly.

### 6.2 Update Form Components
Update components that directly access localStorage to use the new store methods:

```typescript
// components/FormPreview.tsx (Example update)
import { useEffect } from 'react';
import { useFormStore } from '../store/formStore';

export function FormPreview({ formId }: { formId: string }) {
  const { getFormById, addFormView } = useFormStore();
  const [form, setForm] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadForm() {
      try {
        setLoading(true);
        const formData = await getFormById(formId);
        setForm(formData || null);
        
        if (formData) {
          await addFormView(formId);
        }
      } catch (error) {
        console.error('Error loading form:', error);
      } finally {
        setLoading(false);
      }
    }

    loadForm();
  }, [formId, getFormById, addFormView]);

  // Rest of component...
}
```

---

## Phase 7: Testing & Validation

### 7.1 Testing Checklist

#### Authentication Testing
- [ ] User registration works with Firebase Auth
- [ ] User login works and syncs to Supabase
- [ ] Password reset functionality works
- [ ] Profile updates sync between Firebase and Supabase
- [ ] Auth state persistence across page reloads
- [ ] Protected routes work correctly

#### Data Migration Testing
- [ ] localStorage data extracts correctly
- [ ] Users migrate to Supabase without data loss
- [ ] Forms migrate with all properties intact
- [ ] Form responses maintain data integrity
- [ ] Analytics cache transfers properly

#### Database Operations Testing
- [ ] Forms CRUD operations work correctly
- [ ] Form responses submit and retrieve properly
- [ ] Real-time subscriptions work (if implemented)
- [ ] Row Level Security policies function correctly
- [ ] Database performance is acceptable

#### Integration Testing
- [ ] All existing features work with new backend
- [ ] Form sharing functionality works
- [ ] Analytics and insights generate correctly
- [ ] Export functionality works with database data

### 7.2 Performance Considerations
- Implement pagination for large form lists
- Add database indexes for frequently queried fields
- Optimize Supabase queries to minimize data transfer
- Implement caching strategies for frequently accessed data

---

## Deployment Strategy

### 7.1 Environment Setup
1. **Development**: Local Firebase emulator + Supabase local development
2. **Staging**: Firebase project + Supabase staging environment
3. **Production**: Firebase production + Supabase production

### 7.2 Rollout Plan
1. **Beta Testing**: Deploy to staging with migration tool for beta users
2. **Gradual Rollout**: Offer migration option to existing users
3. **Full Migration**: Switch default to new system, keep localStorage as fallback
4. **Cleanup**: Remove localStorage code after successful migration period

---

## Post-Migration Enhancements

### 7.1 Real-time Features
With Supabase, you can implement real-time features:
- Live form response monitoring
- Collaborative form editing
- Real-time analytics updates

### 7.2 Advanced Features
- Form sharing with proper permissions
- Team collaboration features
- Advanced analytics with Supabase functions
- Automated backups and data export

---

## Risk Mitigation

### 7.1 Data Loss Prevention
- Always backup localStorage data before migration
- Implement rollback procedures
- Test migration thoroughly in staging
- Provide manual data export options

### 7.2 Downtime Minimization
- Implement feature flags for gradual rollout
- Keep localStorage as fallback during transition
- Monitor performance and error rates closely

### 7.3 User Communication
- Provide clear migration instructions
- Offer support during transition period
- Document new features and capabilities
- Provide data export tools for user confidence

---

## Success Metrics

### 7.1 Technical Metrics
- Migration success rate (>98%)
- Database query performance (<200ms average)
- Authentication success rate (>99.9%)
- Zero data loss during migration

### 7.2 User Experience Metrics
- User satisfaction with new features
- Feature adoption rates
- Support ticket volume
- User retention during transition

---

This migration plan provides a comprehensive roadmap for transitioning from your current mock authentication and localStorage system to a robust Firebase Auth + Supabase architecture. The phased approach minimizes risk while ensuring all data and functionality is preserved during the transition. 