import { FormSchema, Question, QuestionType } from '../types';
import { 
  validateFormDataWithRetry, 
  normalizeFormData, 
  normalizeQuestionData,
  parseManifesto,
  parseQuestions
} from './validation';
import { generateFormId } from './utils';
import { generateFormSchema } from './gemini';

/**
 * Form Generator with Auto-Retry and Data Normalization
 * 
 * This module handles form generation with robust error handling and data normalization.
 * It separates manifesto and questions processing for better maintainability.
 */

export interface FormGenerationOptions {
  maxRetries?: number;
  enableAutoRetry?: boolean;
  normalizeData?: boolean;
  fallbackOnError?: boolean;
}

export interface FormGenerationResult {
  success: boolean;
  form?: FormSchema;
  error?: string;
  attempts: number;
  normalized: boolean;
}

/**
 * Generate a complete form with manifesto and questions
 * Includes auto-retry logic and data normalization
 */
export async function generateFormWithRetry(
  prompt: string, 
  options: FormGenerationOptions = {}
): Promise<FormGenerationResult> {
  const {
    maxRetries = 3,
    enableAutoRetry = true,
    normalizeData = true,
    fallbackOnError = true
  } = options;

  let attempts = 0;
  let lastError: string | null = null;

  while (attempts < maxRetries) {
    attempts++;
    
    try {
      console.log(`Form generation attempt ${attempts}/${maxRetries}`);
      
      // Generate the initial form schema
      const rawForm = await generateFormSchema(prompt);
      
      // Normalize data if enabled
      const formToValidate = normalizeData ? normalizeFormData(rawForm) : rawForm;
      
      // Validate with auto-retry
      const validatedForm = await validateFormDataWithRetry(formToValidate, 2);
      
      return {
        success: true,
        form: validatedForm,
        attempts,
        normalized: normalizeData
      };
      
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.warn(`Form generation attempt ${attempts} failed:`, lastError);
      
      // If this is the last attempt and fallback is enabled, create a basic form
      if (attempts === maxRetries && fallbackOnError) {
        console.log('Creating fallback form due to generation failures');
        const fallbackForm = createFallbackForm(prompt);
        
        return {
          success: true,
          form: fallbackForm,
          attempts,
          normalized: true
        };
      }
      
      // If auto-retry is disabled, break immediately
      if (!enableAutoRetry) {
        break;
      }
      
      // Wait before retrying (exponential backoff)
      if (attempts < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempts - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  return {
    success: false,
    error: lastError || 'Form generation failed after all attempts',
    attempts,
    normalized: false
  };
}

/**
 * Generate manifesto separately from questions
 * Useful for when you want to process manifesto and questions independently
 */
export async function generateManifestoOnly(
  prompt: string,
  options: FormGenerationOptions = {}
): Promise<{ success: boolean; manifesto?: string; manifestoData?: any; error?: string }> {
  try {
    console.log('📝 Generating manifesto directly via API...');
    
    // Build the full Edge Function URL (reuse logic from gemini.ts)
    const _env: any = (import.meta as any).env ?? {};
    const _supabaseUrl: string | undefined = _env.VITE_SUPABASE_URL?.replace(/\/$/, '');
    const _derivedApiUrl = _supabaseUrl ? `${_supabaseUrl}/functions/v1/ai` : undefined;
    const _localDefault = 'http://localhost:54321/functions/v1/ai';
    const apiBaseUrl: string = _env.VITE_API_URL || _derivedApiUrl || _localDefault;

    // Call the backend API directly – backend now builds full system prompt
    const response = await fetch(`${apiBaseUrl}/api/ai/generate-manifesto`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${_env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        prompt: prompt.trim()
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.error) {
      throw new Error(result.message || result.error);
    }

    // The API should return a structured manifesto
    if (result.manifesto) {
      return {
        success: true,
        manifesto: result.manifesto,
        manifestoData: result.manifestoData
      };
    }

    throw new Error('No manifesto returned from API');
    
  } catch (error) {
    console.error('❌ Manifesto generation failed:', error);
    
    // Fallback to simple manifesto generation without API
    return generateSimpleManifesto(prompt);
  }
}

/**
 * Fallback manifesto generation when API fails
 */
function generateSimpleManifesto(prompt: string): { success: boolean; manifesto: string; manifestoData: any } {
  const title = prompt.toLowerCase();
  
  let productVision = '';
  let targetAudience = '';
  let businessGoals: string[] = [];
  let keyQuestionAreas: string[] = [];
  
  // Simple keyword-based manifesto generation
  if (title.includes('feedback') || title.includes('survey') || title.includes('review')) {
    productVision = "Gather valuable feedback to improve our services and better meet customer needs. Our goal is to understand what works well and what can be enhanced.";
    targetAudience = "Current and potential customers who have experience with our products or services";
    businessGoals = ["improve service quality", "increase customer satisfaction", "identify areas for enhancement"];
    keyQuestionAreas = ["service quality", "user experience", "feature requests", "pain points", "satisfaction levels"];
  } else if (title.includes('contact') || title.includes('support') || title.includes('help')) {
    productVision = "Understand specific customer needs to provide the best possible assistance and support. We want to tailor our help to each situation.";
    targetAudience = "Users seeking help, support, or information about our services";
    businessGoals = ["provide better support", "understand customer issues", "improve response times"];
    keyQuestionAreas = ["issue description", "urgency level", "preferred contact method", "previous attempts", "specific requirements"];
  } else if (title.includes('registration') || title.includes('signup') || title.includes('join')) {
    productVision = "Learn about new users to provide a personalized onboarding experience. We want to understand interests and preferences from the start.";
    targetAudience = "New users interested in joining our platform or service";
    businessGoals = ["improve onboarding", "understand user needs", "personalize experience"];
    keyQuestionAreas = ["background information", "goals and objectives", "experience level", "preferences", "expectations"];
  } else if (title.includes('product') || title.includes('service') || title.includes('business')) {
    productVision = "Understand business needs and objectives to provide the most relevant solutions. We want to tailor our offerings to specific requirements.";
    targetAudience = "Business professionals and decision-makers looking for solutions";
    businessGoals = ["understand business needs", "provide relevant solutions", "build strong partnerships"];
    keyQuestionAreas = ["business goals", "current challenges", "budget considerations", "timeline requirements", "success metrics"];
  } else {
    productVision = "Understand user needs and gather valuable insights to provide better assistance. Our goal is to learn about situations and help achieve objectives.";
    targetAudience = "Users seeking information, assistance, or wanting to share their thoughts";
    businessGoals = ["understand user needs", "provide valuable assistance", "gather actionable insights"];
    keyQuestionAreas = ["current situation", "specific needs", "preferences", "goals", "expectations"];
  }
  
  const manifestoText = `${productVision}\n\nTarget Audience: ${targetAudience}\n\nBusiness Goals: ${businessGoals.join(', ')}\n\nKey Question Areas: ${keyQuestionAreas.join(', ')}`;
  
  const manifestoData = {
    productVision,
    targetAudience,
    businessGoals,
    keyQuestionAreas,
    conversationTone: 'friendly' as const
  };

  return {
    success: true,
    manifesto: manifestoText,
    manifestoData
  };
}

/**
 * Generate questions separately from manifesto
 * Useful for when you want to process questions independently
 */
export async function generateQuestionsOnly(
  prompt: string,
  manifesto?: string,
  options: FormGenerationOptions = {}
): Promise<{ success: boolean; questions?: Question[]; error?: string }> {
  try {
    const result = await generateFormWithRetry(prompt, options);
    
    if (result.success && result.form) {
      return {
        success: true,
        questions: result.form.questions || []
      };
    }
    
    return {
      success: false,
      error: result.error
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Parse and validate existing form data with auto-retry
 * Useful for fixing corrupted or malformed form data
 */
export async function repairFormData(
  formData: any,
  options: FormGenerationOptions = {}
): Promise<FormGenerationResult> {
  const {
    maxRetries = 3,
    enableAutoRetry = true,
    normalizeData = true
  } = options;

  let attempts = 0;
  let lastError: string | null = null;

  while (attempts < maxRetries) {
    attempts++;
    
    try {
      console.log(`Form repair attempt ${attempts}/${maxRetries}`);
      
      // Normalize data if enabled
      const formToValidate = normalizeData ? normalizeFormData(formData) : formData;
      
      // Validate with auto-retry
      const validatedForm = await validateFormDataWithRetry(formToValidate, 2);
      
      return {
        success: true,
        form: validatedForm,
        attempts,
        normalized: normalizeData
      };
      
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.warn(`Form repair attempt ${attempts} failed:`, lastError);
      
      // If auto-retry is disabled, break immediately
      if (!enableAutoRetry) {
        break;
      }
      
      // Wait before retrying (exponential backoff)
      if (attempts < maxRetries) {
        const delay = Math.min(500 * Math.pow(2, attempts - 1), 2000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  return {
    success: false,
    error: lastError || 'Form repair failed after all attempts',
    attempts,
    normalized: false
  };
}

/**
 * Create a fallback form when AI generation fails
 * Provides a basic but functional form structure
 */
function createFallbackForm(prompt: string): FormSchema {
  const fallbackQuestions: Question[] = [
    {
      id: 'welcome',
      type: 'welcome',
      label: 'Welcome!',
      description: 'Thank you for taking the time to complete this form.',
      required: false
    },
    {
      id: 'q1',
      type: 'text',
      label: 'Tell us about your needs',
      description: 'Please describe what you\'re looking for.',
      placeholder: 'Describe your requirements...',
      required: true
    },
    {
      id: 'q2',
      type: 'textarea',
      label: 'Additional details',
      description: 'Any other information that would be helpful?',
      placeholder: 'Share any additional context...',
      required: false
    },
    {
      id: 'q3',
      type: 'multiple-choice',
      label: 'How urgent is this?',
      description: 'Help us prioritize your request.',
      options: [
        { value: 'urgent', label: 'Very urgent - need this soon' },
        { value: 'moderate', label: 'Moderately urgent - within a few weeks' },
        { value: 'flexible', label: 'Flexible timeline - no rush' }
      ],
      required: true
    },
    {
      id: 'q4',
      type: 'email',
      label: 'Contact information',
      description: 'How can we reach you?',
      placeholder: 'your.email@example.com',
      required: true
    }
  ];

  return {
    id: generateFormId(),
    title: 'Form Request',
    description: `Form created from: "${prompt}"`,
    manifesto: `We aim to help you with your request: ${prompt}`,
    questions: fallbackQuestions,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    views: 0,
    intelligentFollowUps: true
  };
}

/**
 * Validate and normalize a single question
 * Useful for fixing individual question data
 */
export function repairQuestion(question: any): Question {
  const normalized = normalizeQuestionData(question);
  
  // Ensure all required fields are present
  if (!normalized.id) {
    normalized.id = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  if (!normalized.label) {
    normalized.label = 'Question';
  }
  
  if (!normalized.type) {
    normalized.type = 'text';
  }
  
  // Ensure options are properly formatted for multiple-choice questions
  if (normalized.type === 'multiple-choice' && (!normalized.options || normalized.options.length === 0)) {
    normalized.options = [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
      { value: 'option3', label: 'Option 3' }
    ];
  }
  
  return normalized as Question;
}

/**
 * Batch repair multiple questions
 * Useful for fixing an entire form's question set
 */
export function repairQuestions(questions: any[]): Question[] {
  if (!Array.isArray(questions)) {
    return [];
  }
  
  return questions.map((question, index) => {
    const repaired = repairQuestion(question);
    
    // Ensure first question is welcome type
    if (index === 0 && repaired.type !== 'welcome') {
      repaired.type = 'welcome';
      repaired.label = repaired.label || 'Welcome!';
      repaired.description = repaired.description || 'Thank you for taking the time to complete this form.';
    }
    
    return repaired;
  });
} 