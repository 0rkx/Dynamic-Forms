import { create } from 'zustand';
import { FormSchema, FormResponse, FormAnalysis } from '../types';
import { analyzeFormSchemaWithCache } from '../lib/gemini';
import { generateFormId } from '../lib/utils';
import { supabaseService } from '../lib/supabaseService';
import { useAuthStore } from './authStore';

interface FormState {
  // State
  forms: FormSchema[];
  responses: Record<string, FormResponse[]>;
  responsesLastLoaded: Record<string, number>;
  pendingForm: FormSchema | null;
  analyses: Record<string, FormAnalysis | null>;
  analysisLoading: Record<string, boolean>;
  loading: boolean;
  error: string | null;

  // Form Management Actions
  loadForms: () => Promise<void>;
  addForm: (form: Omit<FormSchema, 'createdAt' | 'updatedAt' | 'views' | 'ownerId'>) => Promise<void>;
  getFormById: (id: string) => Promise<FormSchema | undefined>;
  getFormsByOwner: (ownerId: string) => FormSchema[];
  updateForm: (formId: string, updates: Partial<Omit<FormSchema, 'id' | 'createdAt'>>) => Promise<void>;
  deleteForm: (formId: string) => Promise<void>;
  addFormView: (formId: string) => Promise<void>;
  duplicateForm: (formId: string) => Promise<FormSchema | undefined>;

  // Response Management Actions
  addResponse: (response: Omit<FormResponse, 'id' | 'submittedAt' | 'status'>) => Promise<void>;
  getResponsesByFormId: (formId: string) => FormResponse[];
  loadFormResponses: (formId: string) => Promise<void>;
  refreshFormResponses: (formId: string) => Promise<void>;

  // UI State Actions
  setPendingForm: (form: FormSchema | null) => void;
  clearPendingForm: () => void;
  clearError: () => void;

  // Analysis Actions
  getAnalysis: (formId: string) => FormAnalysis | null;
  setAnalysis: (formId: string, analysis: FormAnalysis | null) => void;
  isAnalyzing: (formId: string) => boolean;
  analyzeFormInBackground: (form: FormSchema) => Promise<void>;
  invalidateAnalysis: (formId: string) => void;
}

export const useFormStore = create<FormState>((set, get) => ({
  // Initial State
  forms: [],
  responses: {},
  responsesLastLoaded: {},
  pendingForm: (() => {
    // Try to restore pending form from localStorage
    try {
      const stored = localStorage.getItem('pendingForm');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to restore pending form from localStorage:', error);
      return null;
    }
  })(),
  analyses: {},
  analysisLoading: {},
  loading: false,
  error: null,

  // Form Management Actions
  loadForms: async () => {
    const { getUserId } = useAuthStore.getState();
    const userId = getUserId();
    
    console.log('loadForms: userId:', userId);
    
    if (!userId) {
      set({ error: 'User not authenticated', loading: false });
      return;
    }

    try {
      set({ loading: true, error: null });
      
      console.log('loadForms: Loading forms for user:', userId);
      
      // Verify connection first
      const connected = await supabaseService.verifyConnection();
      if (!connected) {
        throw new Error('Database connection failed. Please check your internet connection.');
      }
      
      const forms = await supabaseService.getForms(userId);
      console.log('loadForms: Loaded forms:', forms);
      
      set({ 
        forms, 
        loading: false, 
        error: null 
      });
    } catch (error: any) {
      console.error('Error loading forms:', error);
      set({ 
        error: error.message || 'Failed to load forms', 
        loading: false 
      });
    }
  },

  addForm: async (form) => {
    const { getUserId } = useAuthStore.getState();
    const userId = getUserId();
    
    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      set({ error: null });
      
      const newForm = await supabaseService.createForm(form, userId);
      
      set((state) => ({
        forms: [newForm, ...state.forms],
        error: null
      }));
    } catch (error: any) {
      console.error('Error creating form:', error);
      const errorMessage = error.message || 'Failed to create form';
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  getFormById: async (id) => {
    try {
      // First check if we have it in local state
      const { forms } = get();
      const localForm = forms.find(form => form.id === id);
      if (localForm) {
        return localForm;
      }

      // If not in local state, fetch from database
      const form = await supabaseService.getFormById(id);
      return form || undefined;
    } catch (error: any) {
      console.error('Error fetching form:', error);
      set({ error: error.message || 'Failed to fetch form' });
      return undefined;
    }
  },

  getFormsByOwner: (ownerId) => {
    const { forms } = get();
    return forms.filter(form => form.ownerId === ownerId);
  },

  updateForm: async (formId, updates) => {
    try {
      set({ error: null });
      
      await supabaseService.updateForm(formId, updates);
      
      set((state) => ({
        forms: state.forms.map(form =>
          form.id === formId
            ? { ...form, ...updates, updatedAt: new Date().toISOString() }
            : form
        ),
        error: null
      }));
    } catch (error: any) {
      console.error('Error updating form:', error);
      const errorMessage = error.message || 'Failed to update form';
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  deleteForm: async (formId) => {
    try {
      set({ error: null });
      
      await supabaseService.deleteForm(formId);
      
      set((state) => {
        const newResponses = { ...state.responses };
        const newAnalyses = { ...state.analyses };
        delete newResponses[formId];
        delete newAnalyses[formId];
        
        return {
          forms: state.forms.filter(form => form.id !== formId),
          responses: newResponses,
          analyses: newAnalyses,
          error: null
        };
      });
    } catch (error: any) {
      console.error('Error deleting form:', error);
      const errorMessage = error.message || 'Failed to delete form';
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  addFormView: async (formId) => {
    try {
      await supabaseService.incrementFormViews(formId);
      
      // Update local state optimistically
      set((state) => ({
        forms: state.forms.map(form =>
          form.id === formId
            ? { ...form, views: form.views + 1 }
            : form
        )
      }));
    } catch (error: any) {
      console.error('Error incrementing form views:', error);
      // Don't throw error for view counting - it's not critical
    }
  },

  duplicateForm: async (formId) => {
    const { getUserId } = useAuthStore.getState();
    const userId = getUserId();
    
    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      set({ error: null });
      
      const newForm = await supabaseService.duplicateForm(formId, userId);
      
      if (!newForm) {
        throw new Error('Failed to duplicate form');
      }
      
      set((state) => ({
        forms: [newForm, ...state.forms],
        error: null
      }));

      return newForm;
    } catch (error: any) {
      console.error('Error duplicating form:', error);
      const errorMessage = error.message || 'Failed to duplicate form';
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  // Response Management Actions
  addResponse: async (response) => {
    console.log('FormStore.addResponse called with:', {
      formId: response.formId,
      startedAt: response.startedAt,
      answersCount: Object.keys(response.answers || {}).length,
      hasAnswers: !!response.answers,
      answers: response.answers
    });

    // Validate required fields
    if (!response.formId) {
      const error = new Error('Form ID is required for response submission');
      console.error('FormStore.addResponse validation failed:', error.message);
      throw error;
    }

    if (!response.answers || typeof response.answers !== 'object') {
      const error = new Error('Answers object is required for response submission');
      console.error('FormStore.addResponse validation failed:', error.message);
      throw error;
    }

    if (!response.startedAt) {
      console.warn('FormStore.addResponse: startedAt is missing, using current time');
      response.startedAt = new Date().toISOString();
    }

    try {
      set({ error: null });
      
      console.log('FormStore.addResponse: calling supabaseService.submitResponse...');
      const responseId = await supabaseService.submitResponse(response);
      console.log('FormStore.addResponse: response submitted successfully with ID:', responseId);
      
      // Optionally update local state with the new response
      const fullResponse: FormResponse = {
        ...response,
        id: responseId,
        submittedAt: new Date().toISOString(),
        status: 'completed'
      };

      console.log('FormStore.addResponse: updating local state with response:', fullResponse);

      set((state) => ({
        responses: {
          ...state.responses,
          [response.formId]: [
            fullResponse,
            ...(state.responses[response.formId] || [])
          ]
        },
        responsesLastLoaded: { ...state.responsesLastLoaded, [response.formId]: Date.now() },
        error: null
      }));

      console.log('FormStore.addResponse: local state updated successfully');
    } catch (error: any) {
      console.error('FormStore.addResponse: error submitting response:', error);
      console.error('FormStore.addResponse: error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      set({ error: error.message });
      throw error;
    }
  },

  getResponsesByFormId: (formId) => {
    const { responses } = get();
    return responses[formId] || [];
  },

  loadFormResponses: async (formId) => {
    try {
      set({ error: null });
      
      // Check if we already have responses cached and they're recent (less than 5 minutes old)
      const { responses, responsesLastLoaded } = get();
      const existingResponses = responses[formId];
      const lastLoaded = responsesLastLoaded?.[formId];
      const now = Date.now();
      const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
      
      if (existingResponses && lastLoaded && (now - lastLoaded) < CACHE_DURATION) {
        console.log('Using cached form responses for form:', formId);
        return; // Use cached data
      }
      
      console.log('Loading fresh form responses for form:', formId);
      const freshResponses = await supabaseService.getFormResponses(formId);
      
      set((state) => ({
        responses: { ...state.responses, [formId]: freshResponses },
        responsesLastLoaded: { ...state.responsesLastLoaded, [formId]: now },
        error: null
      }));
    } catch (error: any) {
      console.error('Error loading form responses:', error);
      set({ error: error.message });
      throw error;
    }
  },

  refreshFormResponses: async (formId) => {
    try {
      set({ error: null });
      
      console.log('Force refreshing form responses for form:', formId);
      const freshResponses = await supabaseService.getFormResponses(formId);
      
      set((state) => ({
        responses: { ...state.responses, [formId]: freshResponses },
        responsesLastLoaded: { ...state.responsesLastLoaded, [formId]: Date.now() },
        error: null
      }));
    } catch (error: any) {
      console.error('Error refreshing form responses:', error);
      set({ error: error.message });
      throw error;
    }
  },

  // UI State Actions
  setPendingForm: (form) => {
    set({ pendingForm: form });
    // Persist pending form to localStorage for better reliability
    if (form) {
      try {
        localStorage.setItem('pendingForm', JSON.stringify(form));
      } catch (error) {
        console.warn('Failed to persist pending form to localStorage:', error);
      }
    } else {
      try {
        localStorage.removeItem('pendingForm');
      } catch (error) {
        console.warn('Failed to remove pending form from localStorage:', error);
      }
    }
  },

  clearError: () => set({ error: null }),

  clearPendingForm: () => {
    set({ pendingForm: null });
    try {
      localStorage.removeItem('pendingForm');
    } catch (error) {
      console.warn('Failed to remove pending form from localStorage:', error);
    }
  },

  // Analysis Actions
  getAnalysis: (formId) => {
    const { analyses } = get();
    return analyses[formId] || null;
  },

  setAnalysis: (formId, analysis) => {
    set((state) => ({
      analyses: { ...state.analyses, [formId]: analysis }
    }));
  },

  isAnalyzing: (formId) => {
    const { analysisLoading } = get();
    return analysisLoading[formId] || false;
  },

  analyzeFormInBackground: async (form: FormSchema) => {
    const { setAnalysis, analysisLoading } = get();
    
    // Don't start analysis if already running
    if (analysisLoading[form.id]) return;
    
    // Set loading state
    set((state) => ({
      analysisLoading: { ...state.analysisLoading, [form.id]: true }
    }));
    
    try {
      const analysis = await analyzeFormSchemaWithCache(form);
      setAnalysis(form.id, analysis);
    } catch (error) {
      console.error('Background analysis failed:', error);
      setAnalysis(form.id, null);
    } finally {
      // Clear loading state
      set((state) => ({
        analysisLoading: { ...state.analysisLoading, [form.id]: false }
      }));
    }
  },

  invalidateAnalysis: (formId: string) => {
    // Clear analysis
    set((state) => ({
      analyses: { ...state.analyses, [formId]: null }
    }));
  },
}));
