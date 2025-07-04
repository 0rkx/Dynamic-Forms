export type QuestionType = 
  | 'text' 
  | 'textarea' 
  | 'multiple-choice' 
  | 'rating' 
  | 'email' 
  | 'welcome'
  | 'quick-select'     // Quick button selections
  | 'slider'          // Visual slider input
  | 'mood'            // Emoji mood selector
  | 'priority-matrix' // 2x2 priority grid
  | 'image-choice'    // Choose from images
  | 'timeline'        // Timeline/date picker
  | 'budget-range'    // Budget selection with visual ranges
  | 'feature-ranking' // Drag-and-drop ranking
  | 'conversation-break' // AI-generated conversation transition
  | 'smart-followup'; // AI-generated dynamic follow-up

export interface QuestionOption {
  value: string;
  label: string;
}

export interface QuestionLogic {
  onValue: string;
  goToQuestionId: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  label: string;
  description?: string;
  placeholder?: string;
  options?: QuestionOption[];
  required?: boolean;
  logic?: QuestionLogic[];
  min?: number;
  max?: number;
  minLabel?: string;
  maxLabel?: string;
  // Fields for intelligent follow-ups
  isFollowUp?: boolean;
  originalQuestionId?: string;
  // New fields for conversational AI brain
  aiGenerated?: boolean;
  conversationContext?: string;
  images?: string[]; // For image-choice type
  features?: string[]; // For feature-ranking type
  customStyling?: {
    backgroundColor?: string;
    textColor?: string;
    accentColor?: string;
  };
}

export interface FormSchema {
  id: string;
  title: string;
  description: string;
  originalPrompt?: string; // The user's initial query that led to form creation
  manifesto?: string; // End goal/purpose of the form for AI guidance
  manifestoData?: {
    productVision: string;
    targetAudience: string;
    businessGoals: string[];
    keyQuestionAreas: string[];
    conversationTone: 'professional' | 'friendly' | 'casual' | 'expert';
  }; // Structured manifesto data for editing
  questions: Question[];
  createdAt: string;
  updatedAt: string;
  views: number;
  intelligentFollowUps?: boolean;
  ownerId?: string; // Add owner to link forms to users
  // AI Brain Configuration
  aiConfig?: {
    enabled: boolean;
    conversationStyle: 'professional' | 'friendly' | 'casual' | 'expert';
    maxDynamicQuestions: number;
    adaptationLevel: 'low' | 'medium' | 'high';
    personalityTraits: string[];
  };
  // Enhanced conversation features
  conversationFlow?: {
    allowSkipping: boolean;
    showProgress: boolean;
    enableBranching: boolean;
    smartTransitions: boolean;
  };
}

export interface FormResponse {
  id: string;
  formId: string;
  respondentId?: string;
  submittedAt: string;
  startedAt: string;
  answers: Record<string, any>;
  conversationHistory?: any;
  status: 'in-progress' | 'completed';
  ipAddress?: string;
  userAgent?: string;
}

// Authentication Types (Mock Firebase Auth patterns)
export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends AuthCredentials {
  displayName?: string;
}

export interface AuthError {
  code: string;
  message: string;
}

export type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

// AI Form Analysis Types
export interface FormAnalysisInsight {
  category: 'Form Structure' | 'Question Quality' | 'User Experience' | 'Conversion Optimization' | 'Best Practices';
  type: 'positive' | 'warning' | 'suggestion';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
}

export interface FormAnalysisRecommendation {
  priority: 'high' | 'medium' | 'low';
  action: string;
  reason: string;
}

export interface FormAnalysis {
  overall_score: number;
  insights: FormAnalysisInsight[];
  recommendations: FormAnalysisRecommendation[];
  strengths: string[];
  weaknesses: string[];
}

// AI Form Brain Types
export interface ConversationState {
  currentThread: string;
  userPersonality: {
    communicationStyle: 'brief' | 'detailed' | 'visual' | 'analytical';
    engagementLevel: 'high' | 'medium' | 'low';
    preferredQuestionTypes: QuestionType[];
    responsePatterns: string[];
  };
  contextHistory: Array<{
    questionId: string;
    question: Question;
    answer: any;
    aiInsights: string[];
    timestamp: string;
  }>;
  conversationMetrics: {
    avgResponseTime: number;
    avgResponseLength: number;
    skipRate: number;
    engagementScore: number;
  };
}

export interface AIBrainDecision {
  action: 'continue' | 'generate_followup' | 'adapt_question' | 'change_flow' | 'conclude';
  nextQuestion?: Question;
  adaptedQuestion?: Question;
  reasoning: string;
  confidence: number;
}

export interface SmartQuestionGeneration {
  prompt: string;
  context: ConversationState;
  skeletonReference: Question;
  expectedOutputType: QuestionType;
}

// =============================================
// DUAL-CONTEXT SYSTEM TYPES
// =============================================

// User Manifesto Context - Explicit user guidance
export interface UserManifestoContext {
  productVision: string;
  targetAudience: string;
  coreValues: string[];
  businessGoals: string[];
  keyQuestionAreas: string[];
  conversationTone: 'professional' | 'friendly' | 'casual' | 'expert';
  successMetrics: string[];
}

// Form Context - AI-analyzed conversation insights
export interface FormContextEntry {
  id: string;
  formId: string;
  entryType: 'user_response' | 'ai_insight' | 'conversation_pattern' | 'successful_question';
  content: string;
  metadata: {
    questionId?: string;
    responseLength?: number;
    engagementScore?: number;
    userReaction?: 'loved' | 'liked' | 'neutral' | 'skipped' | 'abandoned';
    insightType?: 'product_need' | 'user_pain' | 'feature_request' | 'market_insight' | 'behavioral_pattern';
    confidence?: number;
  };
  aiAnalysis: {
    keyThemes: string[];
    emotionalTone: string;
    informationRichness: number;
    followUpPotential: number;
    productRelevance: number;
  };
  createdAt: string;
  updatedAt: string;
}

// Cached conversation context for the AI brain
export interface CachedFormContext {
  formId: string;
  totalEntries: number;
  topThemes: Array<{
    theme: string;
    frequency: number;
    relevance: number;
  }>;
  userBehaviorPatterns: Array<{
    pattern: string;
    description: string;
    examples: string[];
  }>;
  successfulQuestionTypes: QuestionType[];
  commonUserPains: string[];
  productInsights: string[];
  conversationQuality: {
    avgEngagement: number;
    completionRate: number;
    avgResponseLength: number;
    topPerformingQuestions: string[];
  };
  lastUpdated: string;
}

// Enhanced AI Brain Decision with dual-context
export interface DualContextAIDecision {
  action: 'continue' | 'generate_contextual_followup' | 'pivot_conversation' | 'deep_dive' | 'conclude';
  nextQuestion?: Question;
  reasoning: string;
  confidence: number;
  contextUsed: {
    manifestoInfluence: number; // 0-100% how much manifesto influenced decision
    formContextInfluence: number; // 0-100% how much cached context influenced decision
    noveltyScore: number; // 0-100% how novel/unique this question is
  };
  expectedOutcome: {
    informationGain: number;
    engagementPrediction: number;
    productRelevance: number;
  };
}

// Smart question generation request
export interface DualContextQuestionRequest {
  formId: string;
  userManifesto: UserManifestoContext;
  formContext: CachedFormContext;
  currentConversation: ConversationState;
  triggerReason: 'natural_flow' | 'user_interest' | 'deep_dive' | 'pivot_needed' | 'insight_opportunity';
}

// AI-generated question with context awareness
export interface ContextAwareQuestion extends Question {
  aiGenerated: true;
  generationContext: {
    triggeredBy: string; // What sparked this question
    manifestoAlignment: string[]; // Which manifesto goals this serves
    formContextUtilized: string[]; // Which cached insights were used
    expectedInsights: string[]; // What we hope to learn
    followUpPotential: number; // 0-100 likelihood this will generate good follow-ups
  };
}

// Form Manifesto Types (matches form_manifestos table)
export interface FormManifesto {
  id: string;
  formId: string;
  productVision?: string;
  targetAudience?: string;
  businessGoals?: string[];
  keyQuestionAreas?: string[];
  conversationTone: 'professional' | 'friendly' | 'casual' | 'expert';
  successMetrics?: string[];
  createdAt: string;
  updatedAt: string;
}

// Response Analysis Types (matches response_analysis table)
export interface ResponseAnalysis {
  id: string;
  responseId: string;
  formId: string;
  keyThemes?: string[];
  emotionalTone?: string;
  followUpPotential?: number;
  generatedAt: string;
}

// New Manifesto Analysis Brain Types
export interface ManifestoAnalysisResult {
  overview: {
    totalResponses: number;
    manifestoAlignment: 'high' | 'medium' | 'low';
    topPriority: string;
  };
  whatPeopleLike: {
    insight: string;
    evidence: string[];
    impact: 'high' | 'medium' | 'low';
    manifestoConnection: string;
  }[];
  whatPeopleDislike: {
    problem: string;
    evidence: string[];
    impact: 'high' | 'medium' | 'low';
    manifestoConnection: string;
  }[];
  actionableInsights: {
    title: string;
    description: string;
    action: string;
    priority: 'high' | 'medium' | 'low';
    effort: 'low' | 'medium' | 'high';
    expectedImpact: string;
  }[];
  recommendedActions: {
    action: string;
    reason: string;
    timeframe: string;
    resources: string[];
    success_metric: string;
  }[];
}
