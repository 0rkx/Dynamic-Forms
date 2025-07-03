import { FormSchema, Question, FormAnalysis } from '../types';
import { validateFormDataWithRetry, sanitizeInput } from './validation';
import { generateFormId } from './utils';
import { AnalysisCache } from './utils';
import { supabaseService } from './supabaseService';

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

// Central API error handler that maps backend errors to user-friendly messages
function handleAPIError(error: any): never {
  if (error instanceof APIError) {
    throw new Error(error.errorData.message);
  }
  
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    throw new Error('Unable to connect to the server. Please check your internet connection and try again.');
  }
  
  if (error.name === 'AbortError') {
    throw new Error('Request was cancelled. Please try again.');
  }
  
  // Network or unknown errors
  throw new Error('Something went wrong. Please try again in a moment.');
}

// Secure fetch wrapper with timeout and error handling
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
    handleAPIError(error);
  }
}


export async function generateFormSchema(prompt: string): Promise<FormSchema> {
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 5) {
        throw new Error('Please provide a more detailed description for your form (at least 5 characters).');
    }
    
    // Sanitize the input prompt to prevent injection attacks
    const sanitizedPrompt = sanitizeInput(prompt);
    
    let response: FormSchema & { manifestoData?: any } | undefined;
    
    try {
        response = await apiRequest<FormSchema & { manifestoData?: any }>('/api/ai/generate-form', {
            method: 'POST',
            body: JSON.stringify({ prompt: sanitizedPrompt }),
        });
        
        // Handle the new response format with manifestoData
        let manifestoText = response.manifesto || '';
        let structuredManifesto: {
            productVision: string;
            targetAudience: string;
            businessGoals: string[];
            keyQuestionAreas: string[];
            conversationTone: 'friendly' | 'professional' | 'casual' | 'expert';
        } | undefined = undefined;
        
        if (response.manifestoData) {
            // Store the structured manifesto data for proper saving
            structuredManifesto = {
                productVision: response.manifestoData.productVision || '',
                targetAudience: response.manifestoData.targetAudience || '',
                businessGoals: response.manifestoData.businessGoals || [],
                keyQuestionAreas: response.manifestoData.keyQuestionAreas || [],
                conversationTone: response.manifestoData.conversationTone || 'friendly'
            };
            
            // Convert structured manifesto data to text format for backward compatibility
            const { productVision, targetAudience, businessGoals, keyQuestionAreas } = response.manifestoData;
            manifestoText = `${productVision}\n\nTarget Audience: ${targetAudience}`;
            if (businessGoals && businessGoals.length > 0) {
                manifestoText += `\n\nBusiness Goals: ${businessGoals.join(', ')}`;
            }
            if (keyQuestionAreas && keyQuestionAreas.length > 0) {
                manifestoText += `\n\nKey Question Areas: ${keyQuestionAreas.join(', ')}`;
            }
        }
        
        // Ensure the form has all necessary manifesto fields for proper persistence
        const formSchema: FormSchema = {
            ...response,
            id: response.id || generateFormId(), // Ensure form ID is set
            originalPrompt: sanitizedPrompt, // Store the original user prompt
            manifesto: manifestoText,
            manifestoData: structuredManifesto,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            views: 0,
            intelligentFollowUps: true, // Always enable intelligent follow-ups for new forms
            aiConfig: {
                enabled: true,
                conversationStyle: 'friendly',
                maxDynamicQuestions: 5,
                adaptationLevel: 'medium',
                personalityTraits: ['empathetic', 'curious']
            },
            conversationFlow: {
                allowSkipping: true,
                showProgress: true,
                enableBranching: true,
                smartTransitions: true
            }
        };
        
        console.log('✅ Generated form schema with manifesto:', {
            hasManifesto: !!formSchema.manifesto,
            hasManifestoData: !!formSchema.manifestoData,
            manifestoLength: formSchema.manifesto?.length,
            manifestoDataKeys: formSchema.manifestoData ? Object.keys(formSchema.manifestoData) : []
        });
        
        const validatedSchema = await validateFormDataWithRetry(formSchema);
        return validatedSchema;
    } catch (error) {
        console.error("Error generating form schema:", error);
        
        // If validation fails, try to repair the data
        if (response) {
            try {
                const { repairFormData } = await import('./formGenerator');
                const repairResult = await repairFormData(response, { 
                    maxRetries: 2, 
                    enableAutoRetry: true, 
                    normalizeData: true 
                });
                
                if (repairResult.success && repairResult.form) {
                    console.log('Form data repaired successfully');
                    return repairResult.form;
                }
            } catch (repairError) {
                console.warn('Form repair failed:', repairError);
            }
        }
        
        throw new Error("Failed to generate form schema. The AI service may be temporarily unavailable.");
    }
}

export async function generateFollowUpQuestion(originalQuestion: Question, userAnswer: string): Promise<Partial<Question> | null> {
    if (!userAnswer || typeof userAnswer !== 'string' || userAnswer.trim().length === 0) {
        return null;
    }
    
    // Sanitize user input to prevent injection attacks
    const sanitizedAnswer = sanitizeInput(userAnswer);
    
    try {
        const followup = await apiRequest<Partial<Question> | null>('/api/ai/generate-followup', {
            method: 'POST',
            body: JSON.stringify({ 
                originalQuestion, 
                userAnswer: sanitizedAnswer 
            }),
        }, 10000); // Shorter timeout for follow-up questions
        
        return followup;
    } catch (error) {
        console.error("Error generating follow-up question:", error);
        return null; // Fail silently for follow-up questions to not break user experience
    }
}

// Enhanced conversation analysis functions
function calculateAverageAnswerLength(history: Array<{question: Question, answer: string}>): number {
    if (history.length === 0) return 0;
    const totalLength = history.reduce((sum, item) => sum + (item.answer?.length || 0), 0);
    return Math.round(totalLength / history.length);
}

function hasDetailedAnswers(history: Array<{question: Question, answer: string}>): boolean {
    return history.some(item => (item.answer?.length || 0) > 50);
}

// New: Conversation quality scoring
function calculateConversationQuality(history: Array<{question: Question, answer: string}>): {
    score: number;
    insights: string[];
} {
    if (history.length === 0) return { score: 0, insights: [] };
    
    const insights: string[] = [];
    let score = 0;
    
    // Factor 1: Answer depth (40% of score)
    const avgLength = calculateAverageAnswerLength(history);
    const depthScore = Math.min(40, Math.round(avgLength / 3)); // 40 points max
    score += depthScore;
    
    if (avgLength > 100) {
        insights.push("User provides detailed, thoughtful responses");
    } else if (avgLength < 20) {
        insights.push("User responses are brief - conversation may be reaching natural end");
    }
    
    // Factor 2: Engagement consistency (30% of score)
    const lengths = history.map(h => h.answer?.length || 0);
    const isConsistent = lengths.every((len, i) => 
        i === 0 || Math.abs(len - lengths[i-1]) < 50
    );
    const engagementScore = isConsistent ? 30 : Math.max(10, 30 - (history.length * 5));
    score += engagementScore;
    
    if (!isConsistent && lengths[lengths.length - 1] < lengths[0] / 2) {
        insights.push("User engagement may be declining");
    }
    
    // Factor 3: Information richness (30% of score)
    const hasKeywords = history.some(h => 
        /\b(because|however|although|specifically|example|instance)\b/i.test(h.answer || '')
    );
    const richnessScore = hasKeywords ? 30 : 15;
    score += richnessScore;
    
    if (hasKeywords) {
        insights.push("Responses contain rich contextual information");
    }
    
    return { score: Math.min(100, score), insights };
}

// New: Smart conversation context optimization
function optimizeConversationContext(context: {
    rootQuestion: Question;
    conversationHistory: Array<{
        question: Question;
        answer: string;
    }>;
}): {
    optimizedContext: {
        rootQuestion: Question;
        conversationHistory: Array<{
            question: Question;
            answer: string;
        }>;
    };
    qualityMetrics: {
        score: number;
        insights: string[];
    };
} {
    const qualityMetrics = calculateConversationQuality(context.conversationHistory);
    
    // Intelligent context truncation based on conversation quality
    let optimizedHistory = context.conversationHistory;
    
    if (context.conversationHistory.length > 5) {
        if (qualityMetrics.score > 70) {
            // High quality conversation - keep more context
            optimizedHistory = [
                ...context.conversationHistory.slice(0, 2),
                {
                    question: { 
                        id: 'context_summary', 
                        type: 'text' as const, 
                        label: `[High-quality conversation continues... ${context.conversationHistory.length - 4} more exchanges]`,
                        required: false
                    },
                    answer: `[...summary of high-quality exchanges with detailed responses...]`
                },
                ...context.conversationHistory.slice(-2)
            ];
        } else {
            // Lower quality - more aggressive truncation
            optimizedHistory = [
                context.conversationHistory[0],
                {
                    question: { 
                        id: 'context_summary', 
                        type: 'text' as const, 
                        label: `[Earlier conversation... ${context.conversationHistory.length - 2} more exchanges]`,
                        required: false
                    },
                    answer: `[...summary of earlier exchanges...]`
                },
                context.conversationHistory[context.conversationHistory.length - 1]
            ];
        }
    }
    
    return {
        optimizedContext: {
            ...context,
            conversationHistory: optimizedHistory
        },
        qualityMetrics
    };
}

// Enhanced Intelligence System Types
export interface ConversationContext {
    rootQuestion: Question;
    conversationHistory: Array<{
        question: Question;
        answer: string;
    }>;
}

export interface ConversationQualityMetrics {
    score: number;
    insights: string[];
}

export interface ConversationMetrics {
    threadLength: number;
    averageAnswerLength: number;
    hasDetailedAnswers: boolean;
    qualityScore?: number;
    qualityInsights?: string[];
}

/**
 * 🚀 Enhanced Intelligence System - Context-Aware Follow-up Generation
 * 
 * This is the new default intelligence system that provides:
 * - Conversation context tracking
 * - Quality-based follow-up decisions  
 * - Smart context optimization
 * - Engagement-aware questioning
 * 
 * @param formManifesto - The form's primary goal/purpose
 * @param conversationContext - Full conversation thread context
 * @param currentQuestion - The question being answered
 * @param userAnswer - User's response to current question
 * @param allPreviousAnswers - All previous answers in the form
 * @returns Enhanced follow-up question or null
 */
export async function generateIntelligentFollowUp(
    formManifesto: string, 
    conversationContext: ConversationContext,
    currentQuestion: Question,
    userAnswer: string, 
    allPreviousAnswers: Record<string, any>
): Promise<Partial<Question> | null> {
    if (!userAnswer || typeof userAnswer !== 'string' || userAnswer.trim().length === 0) {
        return null;
    }
    
    // Sanitize user input to prevent injection attacks
    const sanitizedAnswer = sanitizeInput(userAnswer);
    const sanitizedManifesto = sanitizeInput(formManifesto);
    
    // Sanitize conversation context
    const sanitizedContext = {
        rootQuestion: conversationContext.rootQuestion,
        conversationHistory: conversationContext.conversationHistory.map(item => ({
            question: item.question,
            answer: typeof item.answer === 'string' ? sanitizeInput(item.answer) : item.answer
        }))
    };
    
    // Use smart context optimization
    const { optimizedContext, qualityMetrics } = optimizeConversationContext(sanitizedContext);
    
    try {
        console.log('🌐 Making API request to /api/ai/generate-intelligent-followup-enhanced');
        
        const requestBody = { 
            formManifesto: sanitizedManifesto,
            conversationContext: optimizedContext,
            currentQuestion, 
            userAnswer: sanitizedAnswer,
            previousAnswers: allPreviousAnswers,
            conversationMetrics: {
                threadLength: sanitizedContext.conversationHistory.length,
                averageAnswerLength: calculateAverageAnswerLength(sanitizedContext.conversationHistory),
                hasDetailedAnswers: hasDetailedAnswers(sanitizedContext.conversationHistory),
                qualityScore: qualityMetrics.score,
                qualityInsights: qualityMetrics.insights
            }
        };
        
        console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));
        
        const followup = await apiRequest<Partial<Question> | null>('/api/ai/generate-intelligent-followup-enhanced', {
            method: 'POST',
            body: JSON.stringify(requestBody),
        }, 15000); // Longer timeout for intelligent analysis
        
        console.log('📥 API response:', followup);
        
        return followup;
    } catch (error) {
        console.error("Error generating intelligent follow-up:", error);
        return null;
    }
}

/**
 * Creates the initial conversation context for a new follow-up thread.
 * @param rootQuestion The question that started the conversation thread.
 * @returns A new ConversationContext object.
 */
export function createConversationContext(rootQuestion: Question): ConversationContext {
    return {
        rootQuestion,
        conversationHistory: [],
    };
}

export async function generateIntelligentFollowUpWithContext(
    formManifesto: string, 
    conversationContext: {
        rootQuestion: Question;
        conversationHistory: Array<{
            question: Question;
            answer: string;
        }>;
    },
    currentQuestion: Question,
    userAnswer: string, 
    allPreviousAnswers: Record<string, any>
): Promise<Partial<Question> | null> {
    // This is a wrapper, main logic is in generateIntelligentFollowUp
    return generateIntelligentFollowUp(formManifesto, conversationContext, currentQuestion, userAnswer, allPreviousAnswers);
}

export async function analyzeFormSchema(formSchema: FormSchema): Promise<FormAnalysis> {
    if (!formSchema || !formSchema.questions || formSchema.questions.length === 0) {
        throw new Error("Form schema is invalid or has no questions to analyze.");
    }

    try {
        const sanitizedSchema = { ...formSchema, questions: formSchema.questions.map(q => ({...q, label: sanitizeInput(q.label)})) };

        const analysis = await apiRequest<FormAnalysis>('/api/ai/analyze-form', {
            method: 'POST',
            body: JSON.stringify({ form: sanitizedSchema }),
        });
        
        return analysis;
    } catch (error) {
        console.error("Error analyzing form schema:", error);
        throw new Error("Failed to analyze form schema. The AI service may be temporarily unavailable.");
    }
}

export async function analyzeFormSchemaWithCache(formSchema: FormSchema): Promise<FormAnalysis> {
    const cacheKey = `form_schema_analysis_${formSchema.id}_${new Date(formSchema.updatedAt).getTime()}`;
    
    try {
        // Check database cache first
        const cachedAnalysis = await supabaseService.getAnalysisCache(cacheKey);
        if (cachedAnalysis) {
            console.log("Using cached form schema analysis from database.");
            return cachedAnalysis;
        }

        // If not in cache, generate new analysis
        const analysis = await analyzeFormSchema(formSchema);
        
        // Store in database cache for 24 hours
        await supabaseService.setAnalysisCache(cacheKey, analysis, 24);
        
        return analysis;
    } catch (error) {
        console.error("Error analyzing form schema with cache:", error);
        // Fallback to generating analysis without caching on error
        return analyzeFormSchema(formSchema);
    }
}

export async function analyzeFormResponses(formSchema: FormSchema, responses: any[]): Promise<any> {
    if (responses.length === 0) {
        return {
            overview: { totalResponses: 0, mainThemes: [], overallSentiment: 'neutral' },
            keyInsights: [],
            recommendations: []
        };
    }

    try {
        const sanitizedSchema = { ...formSchema, questions: formSchema.questions.map(q => ({...q, label: sanitizeInput(q.label)})) };
        const sanitizedResponses = responses.map(r => {
            const sanitizedAnswers: Record<string, any> = {};
            for (const key in r.answers) {
                sanitizedAnswers[key] = sanitizeInput(r.answers[key]);
            }
            return { ...r, answers: sanitizedAnswers };
        });

        const analysis = await apiRequest<any>('/api/ai/analyze-form-responses', {
            method: 'POST',
            body: JSON.stringify({ 
                formSchema: sanitizedSchema,
                responses: sanitizedResponses,
            }),
        }, 60000); // 60-second timeout for response analysis

        return analysis;
    } catch (error) {
        console.error("Error analyzing form responses:", error);
        throw new Error("Failed to analyze responses. The AI service may be temporarily unavailable.");
    }
}