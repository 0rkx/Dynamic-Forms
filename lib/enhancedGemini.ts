import { 
  Question, 
  DualContextQuestionRequest, 
  ContextAwareQuestion, 
  UserManifestoContext,
  CachedFormContext
} from '../types';
import { generateFormId } from './utils';
import { validateFormDataWithRetry, sanitizeInput } from './validation';

// Configuration for the backend API
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

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
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
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
    // Build context-rich prompt for the AI
    const contextPrompt = buildDualContextPrompt(request, currentQuestion, userAnswer);
    
    // Sanitize inputs
    const sanitizedAnswer = sanitizeInput(userAnswer);
    const sanitizedPrompt = sanitizeInput(contextPrompt);
    
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
        contextPrompt: sanitizedPrompt,
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

/**
 * Build a rich context prompt that includes both manifesto and form context
 * This is what makes the AI behave like a real product strategist
 */
function buildDualContextPrompt(
  request: DualContextQuestionRequest,
  currentQuestion: Question,
  userAnswer: string
): string {
  const { userManifesto, formContext } = request;
  
  let prompt = `You are an expert product strategist conducting a conversation to deeply understand the user's product needs.

PRODUCT CONTEXT (User Manifesto):
- Product Vision: ${userManifesto.productVision}
- Target Audience: ${userManifesto.targetAudience}
- Core Values: ${userManifesto.coreValues.join(', ')}
- Business Goals: ${userManifesto.businessGoals.join(', ')}
- Key Question Areas: ${userManifesto.keyQuestionAreas.join(', ')}
- Conversation Tone: ${userManifesto.conversationTone}

CONVERSATION CONTEXT (Previous Insights):`;

  if (formContext.totalEntries > 0) {
    prompt += `
- Total conversations analyzed: ${formContext.totalEntries}
- Top themes from previous users: ${formContext.topThemes.map(t => t.theme).join(', ')}
- Common user pain points: ${formContext.commonUserPains.join(', ')}
- Product insights discovered: ${formContext.productInsights.join(', ')}
- Successful question types: ${formContext.successfulQuestionTypes.join(', ')}`;
  } else {
    prompt += `
- This is a new form - no previous conversation data available`;
  }

  prompt += `

CURRENT SITUATION:
- The user just answered: "${currentQuestion.label}"
- Their response was: "${userAnswer}"
- Trigger reason: ${request.triggerReason}

INSTRUCTIONS:
Generate a follow-up question that:
1. DIRECTLY builds on their specific answer
2. Aligns with the product vision and business goals
3. Avoids topics already covered by previous users (if any)
4. Uses the specified conversation tone
5. Aims to uncover deep product insights
6. Is genuinely curious and not robotic

The question should feel like it's coming from someone who:
- Really understands their product space
- Is genuinely interested in their specific situation
- Has the context to ask intelligent follow-ups
- Knows what insights would be most valuable

Generate a specific, contextual question that would make the user think "Wow, this person really gets it."`;

  return prompt;
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
    const prompt = `Based on this product manifesto, generate a strategic question that would help understand the user's needs:

Product Vision: ${manifestoContext.productVision}
Target Audience: ${manifestoContext.targetAudience}
Business Goals: ${manifestoContext.businessGoals.join(', ')}
Key Question Areas: ${manifestoContext.keyQuestionAreas.join(', ')}

Previous conversation context: ${conversationHistory.join(' | ')}

Generate a question that directly serves the business goals and uncovers insights about the target audience.`;

    const response = await apiRequest<{ question: Partial<Question> }>('/api/ai/generate-manifesto-question', {
      method: 'POST',
      body: JSON.stringify({ prompt: sanitizeInput(prompt) }),
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