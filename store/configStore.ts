import { create } from 'zustand';
import { supabaseService } from '../lib/supabaseService';

interface ConfigStore {
  questionTypes: string[];
  examplePrompts: string[];
  loading: boolean;
  error: string | null;
  
  loadConfig: () => Promise<void>;
}

export const useConfigStore = create<ConfigStore>((set) => ({
  questionTypes: [
    'text', 
    'textarea', 
    'multiple-choice', 
    'rating', 
    'email', 
    'welcome'
  ],
  examplePrompts: [
    "A simple contact form",
    "Customer feedback survey for a coffee shop", 
    "Event registration for a tech meetup",
    "Product feedback questionnaire",
    "Employee satisfaction survey",
    "Wedding guest RSVP form"
  ],
  loading: false,
  error: null,

  loadConfig: async () => {
    try {
      set({ loading: true, error: null });
      const config = await supabaseService.getAppConfig();
      set({
        questionTypes: config.question_types || [
          'text', 
          'textarea', 
          'multiple-choice', 
          'rating', 
          'email', 
          'welcome'
        ],
        examplePrompts: config.example_prompts || [
          "A simple contact form",
          "Customer feedback survey for a coffee shop", 
          "Event registration for a tech meetup",
          "Product feedback questionnaire",
          "Employee satisfaction survey",
          "Wedding guest RSVP form"
        ],
        loading: false,
      });
    } catch (error: any) {
      console.error('Failed to load app config:', error);
      // Keep the default values that were set during initialization
      set({ error: error.message, loading: false });
    }
  },
}));

// Initialize config on load
useConfigStore.getState().loadConfig(); 