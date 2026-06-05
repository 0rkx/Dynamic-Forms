import { 
  Question, 
  DualContextQuestionRequest, 
  ContextAwareQuestion, 
  UserManifestoContext,
  CachedFormContext
} from '../types';
import { generateFormId } from './utils';
import { sanitizeInput } from './validation';
import { apiRequest } from './apiClient';

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
