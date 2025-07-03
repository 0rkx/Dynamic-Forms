# Firebase Auth + Supabase Migration Plan

## Overview

This document provides a detailed plan to migrate the Dynamic Forms application from mock authentication and localStorage to Firebase Authentication and Supabase database.

## Current Architecture

- Mock authentication system (`lib/mockAuth.ts`)
- localStorage for all data persistence
- Zustand stores for state management
- Flask backend for AI features only

## Target Architecture

- Firebase Authentication for user management
- Supabase PostgreSQL for data storage
- Maintained Zustand stores with database integration
- Enhanced security with Row Level Security (RLS)

## Migration Timeline: 12-17 Days

### Phase 1: Setup (Days 1-3)
- Firebase project configuration
- Supabase project setup
- Environment variables

### Phase 2: Database (Days 4-7)
- Schema design and creation
- Migration scripts
- RLS policies

### Phase 3: Authentication (Days 8-10)
- Firebase Auth integration
- User sync to Supabase
- Auth store updates

### Phase 4: Frontend (Days 11-14)
- Data service layer
- Store updates
- Component integration

### Phase 5: Testing (Days 15-17)
- Comprehensive testing
- Performance optimization
- Deployment

## Detailed Implementation

### Phase 1: Setup & Configuration (Days 1-3)

#### 1.1 Firebase Project Setup

**Install Dependencies:**
```bash
npm install firebase
```

**Firebase Configuration:**
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

#### 1.2 Supabase Project Setup

**Install Dependencies:**
```bash
npm install @supabase/supabase-js
```

**Supabase Configuration:**
```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

#### 1.3 Environment Variables
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

### Phase 2: Database Schema & Migration (Days 4-7)

#### 2.1 Supabase Database Schema

**Users Table (linked to Firebase Auth):**
```sql
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

-- RLS Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (firebase_uid = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (firebase_uid = auth.jwt() ->> 'sub');
```

**Forms Table:**
```sql
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

-- RLS Policies
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own forms" ON forms
  FOR ALL USING (owner_id IN (
    SELECT id FROM users WHERE firebase_uid = auth.jwt() ->> 'sub'
  ));
```

**Form Responses Table:**
```sql
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

-- RLS Policies
ALTER TABLE form_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Form owners can view responses" ON form_responses
  FOR SELECT USING (form_id IN (
    SELECT id FROM forms WHERE owner_id IN (
      SELECT id FROM users WHERE firebase_uid = auth.jwt() ->> 'sub'
    )
  ));

CREATE POLICY "Anyone can submit responses" ON form_responses
  FOR INSERT WITH CHECK (true);
```

#### 2.2 Data Migration Script

**Migration Utility:**
```typescript
// scripts/migrateData.ts
import { supabase } from '../lib/supabase';

export async function migrateLocalStorageData(): Promise<void> {
  try {
    console.log('Starting data migration...');
    
    // Extract localStorage data
    const data = extractLocalStorageData();
    if (!data) {
      console.log('No data found to migrate');
      return;
    }

    // Migrate in order: users, then forms, then responses
    await migrateUsers(data.users);
    await migrateForms(data.forms);
    await migrateResponses(data.responses);
    
    console.log('Migration completed successfully');
    
    // Option to clear localStorage
    if (confirm('Migration successful! Clear old localStorage data?')) {
      clearLocalStorageData();
    }
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

function extractLocalStorageData() {
  const formsData = localStorage.getItem('dynamic-forms-storage');
  const usersData = localStorage.getItem('mock-auth-users');
  
  if (!formsData) return null;
  
  const parsedData = JSON.parse(formsData);
  const users = usersData ? JSON.parse(usersData) : [];
  
  return {
    forms: parsedData.state?.forms || [],
    responses: parsedData.state?.responses || {},
    users
  };
}

async function migrateUsers(users: any[]): Promise<void> {
  for (const user of users) {
    await supabase.from('users').upsert({
      firebase_uid: user.uid,
      email: user.email,
      display_name: user.displayName,
      email_verified: user.emailVerified || false,
      created_at: user.createdAt || new Date().toISOString()
    }, { onConflict: 'firebase_uid' });
  }
}

async function migrateForms(forms: any[]): Promise<void> {
  // Implementation continues...
}

function clearLocalStorageData(): void {
  const keysToRemove = [
    'dynamic-forms-storage',
    'mock-auth-users',
    'mock-current-user'
  ];
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
  console.log('Cleared localStorage data');
}
```

### Phase 3: Authentication Migration (Days 8-10)

#### 3.1 Firebase Auth Service

**New Auth Service:**
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

  onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  }

  private async syncUserToSupabase(user: FirebaseUser) {
    await supabase.from('users').upsert({
      firebase_uid: user.uid,
      email: user.email!,
      display_name: user.displayName,
      photo_url: user.photoURL,
      email_verified: user.emailVerified,
      updated_at: new Date().toISOString()
    }, { onConflict: 'firebase_uid' });
  }
}

export const firebaseAuth = new FirebaseAuthService();
```

#### 3.2 Updated Auth Store

**Replace Mock Auth with Firebase:**
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

export const useAuthStore = create<AuthStore>((set) => ({
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

### Phase 4: Frontend Integration (Days 11-14)

#### 4.1 Supabase Data Service

**New Data Layer:**
```typescript
// lib/supabaseService.ts
import { supabase } from './supabase';
import { FormSchema, FormResponse } from '../types';

export class SupabaseService {
  // Forms Management
  async getForms(userId: string): Promise<FormSchema[]> {
    const { data, error } = await supabase
      .from('forms')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(this.transformFormFromDB);
  }

  async getFormById(formId: string): Promise<FormSchema | null> {
    const { data, error } = await supabase
      .from('forms')
      .select('*')
      .eq('id', formId)
      .single();

    if (error?.code === 'PGRST116') return null;
    if (error) throw error;
    return this.transformFormFromDB(data);
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

  // Response Management
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

  // Data Transformation Helpers
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

#### 4.2 Updated Form Store

**Database-Backed Store:**
```typescript
// store/formStore.ts (Updated for Supabase)
import { create } from 'zustand';
import { FormSchema, FormResponse } from '../types';
import { supabaseService } from '../lib/supabaseService';
import { useAuthStore } from './authStore';

interface FormState {
  forms: FormSchema[];
  responses: Record<string, FormResponse[]>;
  pendingForm: FormSchema | null;
  loading: boolean;
  
  // Actions
  loadForms: () => Promise<void>;
  addForm: (form: Omit<FormSchema, 'createdAt' | 'updatedAt' | 'views' | 'ownerId'>) => Promise<void>;
  getFormById: (id: string) => Promise<FormSchema | undefined>;
  updateForm: (formId: string, updates: Partial<FormSchema>) => Promise<void>;
  deleteForm: (formId: string) => Promise<void>;
  addResponse: (response: Omit<FormResponse, 'responseId' | 'submittedAt'>) => Promise<void>;
  loadFormResponses: (formId: string) => Promise<void>;
  setPendingForm: (form: FormSchema | null) => void;
}

export const useFormStore = create<FormState>((set, get) => ({
  forms: [],
  responses: {},
  pendingForm: null,
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
      set((state) => ({ forms: [newForm, ...state.forms] }));
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
          form.id === formId ? { ...form, ...updates, updatedAt: new Date().toISOString() } : form
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

  addResponse: async (response) => {
    try {
      await supabaseService.submitResponse(response);
    } catch (error) {
      console.error('Error submitting response:', error);
      throw error;
    }
  },

  loadFormResponses: async (formId) => {
    try {
      const responses = await supabaseService.getFormResponses(formId);
      set((state) => ({ responses: { ...state.responses, [formId]: responses } }));
    } catch (error) {
      console.error('Error loading form responses:', error);
      throw error;
    }
  },

  setPendingForm: (form) => set({ pendingForm: form }),
}));
```

## Executive Summary

This document outlines a comprehensive migration plan to transition the Dynamic Forms application from its current mock authentication and localStorage-based storage system to Firebase Authentication and Supabase database. The migration is designed to be completed in 5 phases over 12-17 days with minimal downtime and zero data loss.

## Current System Analysis

### Authentication Layer
- **Mock Authentication** (`lib/mockAuth.ts`) simulating Firebase Auth API
- **localStorage persistence** for user data and sessions
- **Zustand store** (`store/authStore.ts`) for state management
- No server-side authentication or session management

### Data Storage Layer
- **Client-side only** storage via localStorage
- **Zustand persistence** for forms, responses, and user data
- **Flask backend** solely for AI features (Gemini API integration)
- **Multiple caches** for analytics, form sharing, and AI analysis

### Data Types
- Forms (`FormSchema`): Complete form definitions with questions and metadata
- Responses (`FormResponse`): User submissions to forms
- Users (`User`): Basic user profile information
- Analytics caches for performance optimization

## Migration Timeline

| Phase | Duration | Description |
|-------|----------|-------------|
| **Phase 1** | 2-3 days | Setup & Configuration |
| **Phase 2** | 3-4 days | Database Schema & Migration |
| **Phase 3** | 2-3 days | Authentication Migration |
| **Phase 4** | 3-4 days | Frontend Integration |
| **Phase 5** | 2-3 days | Testing & Deployment |

**Total Duration: 12-17 days**

---

## Phase 1: Setup & Configuration (Days 1-3)

### 1.1 Firebase Project Setup

#### Install Dependencies
```bash
npm install firebase
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

### 1.2 Supabase Project Setup

#### Install Dependencies
```bash
npm install @supabase/supabase-js
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

## Phase 2: Database Schema & Migration (Days 4-7)

### 2.1 Supabase Database Schema

#### Users Table
```sql
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

-- RLS Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (firebase_uid = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (firebase_uid = auth.jwt() ->> 'sub');
```

#### Forms Table
```sql
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

-- Indexes
CREATE INDEX idx_forms_owner_id ON forms(owner_id);
CREATE INDEX idx_forms_created_at ON forms(created_at);

-- RLS Policies
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own forms" ON forms
  FOR ALL USING (owner_id IN (
    SELECT id FROM users WHERE firebase_uid = auth.jwt() ->> 'sub'
  ));
```

#### Form Responses Table
```sql
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

-- RLS Policies
ALTER TABLE form_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Form owners can view responses" ON form_responses
  FOR SELECT USING (form_id IN (
    SELECT id FROM forms WHERE owner_id IN (
      SELECT id FROM users WHERE firebase_uid = auth.jwt() ->> 'sub'
    )
  ));

CREATE POLICY "Anyone can submit responses" ON form_responses
  FOR INSERT WITH CHECK (true);
```

#### Analytics Cache Table
```sql
CREATE TABLE analytics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  cache_data JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_analytics_cache_key ON analytics_cache(cache_key);
CREATE INDEX idx_analytics_cache_expires ON analytics_cache(expires_at);

-- Cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM analytics_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

### 2.2 Data Migration Script
```typescript
// scripts/migrateData.ts
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export async function migrateLocalStorageData(): Promise<void> {
  try {
    console.log('Starting data migration...');

    const data = extractLocalStorageData();
    if (!data) {
      console.log('No data found to migrate');
      return;
    }

    await migrateUsers(data.users, data.currentUser);
    await migrateForms(data.forms);
    await migrateResponses(data.responses);
    
    console.log('Migration completed successfully');
    
    if (confirm('Migration successful! Clear old localStorage data?')) {
      clearLocalStorageData();
    }
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

function extractLocalStorageData() {
  try {
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

function clearLocalStorageData(): void {
  const keysToRemove = [
    'dynamic-forms-storage',
    'mock-auth-users',
    'mock-current-user'
  ];
  
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

## Phase 3: Authentication Migration (Days 8-10)

### 3.1 Firebase Auth Service
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

### 3.2 Updated Auth Store
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

## Phase 4: Frontend Integration (Days 11-14)

### 4.1 Supabase Data Service
```typescript
// lib/supabaseService.ts
import { supabase } from './supabase';
import { FormSchema, FormResponse } from '../types';

export class SupabaseService {
  async getForms(userId: string): Promise<FormSchema[]> {
    const { data, error } = await supabase
      .from('forms')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(this.transformFormFromDB);
  }

  async getFormById(formId: string): Promise<FormSchema | null> {
    const { data, error } = await supabase
      .from('forms')
      .select('*')
      .eq('id', formId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return this.transformFormFromDB(data);
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

### 4.2 Updated Form Store
```typescript
// store/formStore.ts (Updated for Supabase)
import { create } from 'zustand';
import { FormSchema, FormResponse } from '../types';
import { supabaseService } from '../lib/supabaseService';
import { useAuthStore } from './authStore';

interface FormState {
  forms: FormSchema[];
  responses: Record<string, FormResponse[]>;
  pendingForm: FormSchema | null;
  loading: boolean;
  
  loadForms: () => Promise<void>;
  addForm: (form: Omit<FormSchema, 'createdAt' | 'updatedAt' | 'views' | 'ownerId'>) => Promise<void>;
  getFormById: (id: string) => Promise<FormSchema | undefined>;
  updateForm: (formId: string, updates: Partial<FormSchema>) => Promise<void>;
  deleteForm: (formId: string) => Promise<void>;
  addResponse: (response: Omit<FormResponse, 'responseId' | 'submittedAt'>) => Promise<void>;
  loadFormResponses: (formId: string) => Promise<void>;
  setPendingForm: (form: FormSchema | null) => void;
}

export const useFormStore = create<FormState>((set, get) => ({
  forms: [],
  responses: {},
  pendingForm: null,
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

  addResponse: async (response) => {
    try {
      await supabaseService.submitResponse(response);
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
}));
```

---

## Phase 5: Testing & Deployment (Days 15-17)

### 5.1 Testing Checklist

#### Authentication Testing
- [ ] User registration with Firebase Auth
- [ ] User login and Supabase sync
- [ ] Password reset functionality
- [ ] Profile updates
- [ ] Auth state persistence
- [ ] Protected routes

#### Data Operations Testing
- [ ] Form CRUD operations
- [ ] Response submission and retrieval
- [ ] Data migration integrity
- [ ] Performance benchmarks

#### Integration Testing
- [ ] All existing features work
- [ ] Form sharing functionality
- [ ] Analytics generation
- [ ] Export functionality

### 5.2 Performance Optimization
- Implement pagination for large datasets
- Add database indexes for frequent queries
- Optimize Supabase queries
- Implement caching strategies

### 5.3 Deployment Strategy
1. **Development**: Firebase emulator + Supabase local
2. **Staging**: Firebase staging + Supabase staging
3. **Production**: Gradual rollout with fallback options

---

## Risk Mitigation

### Data Loss Prevention
- Always backup localStorage before migration
- Implement rollback procedures
- Provide manual data export options
- Test migration thoroughly in staging

### Downtime Minimization
- Feature flags for gradual rollout
- Keep localStorage as fallback during transition
- Monitor performance and error rates

### User Communication
- Clear migration instructions
- Support during transition
- Documentation of new features
- Data export tools for user confidence

---

## Success Metrics

### Technical Metrics
- Migration success rate (>98%)
- Database query performance (<200ms average)
- Authentication success rate (>99.9%)
- Zero data loss during migration

### User Experience Metrics
- User satisfaction with new features
- Feature adoption rates
- Support ticket volume
- User retention during transition

---

## Post-Migration Enhancements

### Real-time Features
- Live form response monitoring
- Collaborative form editing
- Real-time analytics updates

### Advanced Features
- Enhanced form sharing with permissions
- Team collaboration features
- Advanced analytics with Supabase functions
- Automated backups and data export

---

This migration plan provides a comprehensive roadmap for transitioning to Firebase Auth + Supabase while maintaining all current functionality and ensuring zero data loss during the migration process. 