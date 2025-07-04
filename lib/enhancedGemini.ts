import { 
  Question, 
  DualContextQuestionRequest, 
  ContextAwareQuestion, 
  UserManifestoContext,
  CachedFormContext
} from '../types';
import { generateFormId } from './utils';
import { validateFormDataWithRetry, sanitizeInput } from './validation';

// Configuration for the backend API (Supabase Edge Functions)
const _env = (import.meta as any).env ?? {};
const _supabaseUrl: string | undefined = _env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const _derivedApiUrl = _supabaseUrl ? `${_supabaseUrl}/functions/v1/ai` : undefined;
const _localDefault = 'http://localhost:54321/functions/v1/ai';

const API_BASE_URL: string = _env.VITE_API_URL || _derivedApiUrl || _localDefault;

interface APIError {
  error: string;
  message: string;
}

class APIError extends Error {
  constructor(public status: number, public errorData: APIError) {
    super(errorData.message);
    this.name = 'APIError';
  }
}

// Enhanced API request handler
async function apiRequest<T>(endpoint: string, options: RequestInit = {}, timeoutMs: number = 30000): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  // Get the Supabase anon key for authorization
  const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        ...options.headers,
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        error: 'Unknown Error', 
        message: 'An unexpected error occurred' 
      }));
      throw new APIError(response.status, errorData);
    }
    
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof APIError) {
      throw new Error(error.errorData.message);
    }
    
    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    if (errorObj.name === 'TypeError' && errorObj.message.includes('fetch')) {
      throw new Error('Unable to connect to the server. Please check your internet connection and try again.');
    }
    
    if (errorObj.name === 'AbortError') {
      throw new Error('Request was cancelled. Please try again.');
    }
    
    throw new Error('Something went wrong. Please try again in a moment.');
  }
}

/**
 * Generate a context-aware question using the dual-context system
 * This is the production-critical function that solves the AI question generation problem
 */
export async function generateDualContextQuestion(
  request: DualContextQuestionRequest,
  currentQuestion: Question,
  userAnswer: string
): Promise<ContextAwareQuestion | null> {
  
  if (!userAnswer || typeof userAnswer !== 'string' || userAnswer.trim().length === 0) {
    return null;
  }

  try {
    // Sanitize the user's answer (the only free-text we send to the backend)
    const sanitizedAnswer = sanitizeInput(userAnswer);
    
    // Generate question using enhanced context
    const response = await apiRequest<{
      question: Partial<Question>;
      generationContext: {
        triggeredBy: string;
        manifestoAlignment: string[];
        formContextUtilized: string[];
        expectedInsights: string[];
        followUpPotential: number;
      };
    }>('/api/ai/generate-dual-context-question', {
      method: 'POST',
      body: JSON.stringify({
        currentQuestion,
        userAnswer: sanitizedAnswer,
        manifestoContext: request.userManifesto,
        formContext: request.formContext,
        triggerReason: request.triggerReason
      }),
    }, 15000);

    if (!response.question) return null;

    // Enhance the generated question with context awareness
    const contextAwareQuestion: ContextAwareQuestion = {
      ...response.question,
      id: response.question.id || generateFormId(),
      aiGenerated: true,
      isFollowUp: true,
      originalQuestionId: currentQuestion.id,
      conversationContext: request.currentConversation.currentThread,
      generationContext: response.generationContext
    } as ContextAwareQuestion;

    return contextAwareQuestion;
    
  } catch (error) {
    console.error('Error generating dual-context question:', error);
    
    // Fallback: Generate a simpler context-aware question
    return generateFallbackContextQuestion(request, currentQuestion, userAnswer);
  }
}

// Legacy stub – prompt assembly is now handled in the backend for security reasons.
function buildDualContextPrompt(): string {
  return '';
}

/**
 * Fallback context-aware question generation
 * Used when the main AI service is unavailable
 */
function generateFallbackContextQuestion(
  request: DualContextQuestionRequest,
  currentQuestion: Question,
  userAnswer: string
): ContextAwareQuestion | null {
  
  const { userManifesto, formContext } = request;
  
  // Simple rule-based question generation based on context
  let questionText = '';
  let questionType: Question['type'] = 'textarea';
  let expectedInsights: string[] = [];
  
  // Check if answer relates to common themes
  const answerLower = userAnswer.toLowerCase();
  
  if (answerLower.includes('problem') || answerLower.includes('challenge')) {
    questionText = `You mentioned challenges - thinking about ${userManifesto.targetAudience}, what impact do these challenges have on them specifically?`;
    expectedInsights = ['user_impact', 'pain_severity'];
  } else if (answerLower.includes('feature') || answerLower.includes('functionality')) {
    questionText = `That's interesting! How do you think this feature would align with ${userManifesto.productVision}?`;
    expectedInsights = ['feature_alignment', 'product_vision'];
  } else if (answerLower.includes('user') || answerLower.includes('customer')) {
    questionText = `Tell me more about how this affects your users' experience with ${userManifesto.productVision}?`;
    expectedInsights = ['user_experience', 'product_impact'];
  } else {
    // Generic but contextual follow-up
    questionText = `Building on what you shared, how does this connect to your main goal of ${userManifesto.businessGoals[0] || 'improving your product'}?`;
    expectedInsights = ['goal_alignment', 'strategic_connection'];
  }
  
  if (!questionText) return null;
  
  return {
    id: generateFormId(),
    type: questionType,
    label: questionText,
    placeholder: 'Share your thoughts...',
    required: false,
    aiGenerated: true,
    isFollowUp: true,
    originalQuestionId: currentQuestion.id,
    conversationContext: request.currentConversation.currentThread,
    generationContext: {
      triggeredBy: 'Fallback context-aware generation',
      manifestoAlignment: [userManifesto.productVision],
      formContextUtilized: formContext.topThemes.map(t => t.theme),
      expectedInsights,
      followUpPotential: 75
    }
  };
}

/**
 * Enhanced manifesto-based question generation
 * Uses the user's manifesto to generate relevant questions
 */
export async function generateManifestoAlignedQuestion(
  manifestoContext: UserManifestoContext,
  conversationHistory: string[]
): Promise<Question | null> {
  
  try {
    const response = await apiRequest<{ question: Partial<Question> }>('/api/ai/generate-manifesto-question', {
      method: 'POST',
      body: JSON.stringify({
        manifestoContext,
        conversationHistory
      }),
    });

    if (response.question) {
      return {
        ...response.question,
        id: response.question.id || generateFormId(),
        aiGenerated: true
      } as Question;
    }

    return null;
  } catch (error) {
    console.error('Error generating manifesto-aligned question:', error);
    return null;
  }
}

/**
 * Analyze conversation quality with dual-context awareness
 */
export async function analyzeDualContextConversation(
  formId: string,
  conversationData: {
    questions: Question[];
    answers: Record<string, any>;
    manifestoContext: UserManifestoContext;
    formContext: CachedFormContext;
  }
): Promise<{
  qualityScore: number;
  manifestoAlignment: number;
  contextUtilization: number;
  insights: string[];
  recommendations: string[];
}> {
  
  try {
    const response = await apiRequest<{
      qualityScore: number;
      manifestoAlignment: number;
      contextUtilization: number;
      insights: string[];
      recommendations: string[];
    }>('/api/ai/analyze-dual-context-conversation', {
      method: 'POST',
      body: JSON.stringify({
        formId,
        conversationData
      }),
    });

    return response;
  } catch (error) {
    console.error('Error analyzing dual-context conversation:', error);
    
    // Fallback analysis
    return {
      qualityScore: 50,
      manifestoAlignment: 30,
      contextUtilization: 20,
      insights: ['Analysis unavailable - API error'],
      recommendations: ['Ensure AI service is running', 'Check network connection']
    };
  }
} 