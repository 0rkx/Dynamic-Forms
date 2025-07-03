import { 
  FormSchema, 
  Question, 
  QuestionType, 
  ConversationState, 
  DualContextAIDecision,
  UserManifestoContext,
  CachedFormContext,
  ContextAwareQuestion,
  DualContextQuestionRequest
} from '../types';
import { generateFormId } from './utils';
import { dualContextService } from './dualContextService';
import { generateDualContextQuestion } from './enhancedGemini';

/**
 * Enhanced FormBrain with Dual-Context System
 * 
 * This is the production-critical enhancement that solves the AI question generation problem.
 * It uses both User Manifesto Context and Form Context to generate smart, context-aware questions.
 */
class EnhancedFormBrain {
  private conversationState: ConversationState;
  private formConfig: FormSchema;
  private originalSkeleton: Question[];
  private userManifestoContext: UserManifestoContext | null = null;
  private formContext: CachedFormContext | null = null;
  private contextInitialized = false;

  constructor(formSchema: FormSchema) {
    this.formConfig = formSchema;
    this.originalSkeleton = [...formSchema.questions];
    this.conversationState = this.initializeConversationState();
  }

  private initializeConversationState(): ConversationState {
    return {
      currentThread: generateFormId(),
      userPersonality: {
        communicationStyle: 'detailed',
        engagementLevel: 'high',
        preferredQuestionTypes: ['multiple-choice', 'rating'],
        responsePatterns: []
      },
      contextHistory: [],
      conversationMetrics: {
        avgResponseTime: 0,
        avgResponseLength: 0,
        skipRate: 0,
        engagementScore: 100
      }
    };
  }

  /**
   * Initialize the dual-context system
   * This loads both User Manifesto Context and Form Context for intelligent decisions
   */
  async initializeDualContext(): Promise<void> {
    try {
      // Load User Manifesto Context
      this.userManifestoContext = await dualContextService.getManifestoContext(this.formConfig.id);
      
      // If no structured manifesto exists, try to parse from simple manifesto field
      if (!this.userManifestoContext && this.formConfig.manifesto) {
        const parsedManifesto = dualContextService.parseManifestoText(this.formConfig.manifesto);
        if (parsedManifesto.productVision) {
          this.userManifestoContext = {
            productVision: parsedManifesto.productVision,
            targetAudience: parsedManifesto.targetAudience || 'Users',
            coreValues: parsedManifesto.coreValues || [],
            businessGoals: parsedManifesto.businessGoals || [],
            keyQuestionAreas: parsedManifesto.keyQuestionAreas || [],
            conversationTone: 'friendly',
            successMetrics: parsedManifesto.successMetrics || []
          };
          
          // Save the parsed manifesto for future use
          await dualContextService.saveManifestoContext(this.formConfig.id, this.userManifestoContext);
        }
      }

      // Load Form Context (cached conversation insights)
      this.formContext = await dualContextService.getCachedFormContext(this.formConfig.id);
      
      this.contextInitialized = true;
    } catch (error) {
      console.error('Error initializing dual context:', error);
      // Continue without context if initialization fails
      this.contextInitialized = true;
    }
  }

  /**
   * Main brain function - Enhanced with dual-context intelligence
   * This is where the magic happens - the AI uses both contexts to make smart decisions
   */
  async decideNextAction(
    currentQuestion: Question, 
    userAnswer: any, 
    allAnswers: Record<string, any>
  ): Promise<DualContextAIDecision> {
    
    // Ensure context is initialized
    if (!this.contextInitialized) {
      await this.initializeDualContext();
    }

    // Update conversation state and capture context
    await this.updateConversationStateWithContext(currentQuestion, userAnswer);
    this.analyzeUserBehavior();
    
    return await this.generateDualContextDecision(currentQuestion, userAnswer, allAnswers);
  }

  /**
   * Enhanced conversation state update with context capture
   * Every user response becomes part of the queryable knowledge base
   */
  private async updateConversationStateWithContext(question: Question, answer: any) {
    const now = new Date().toISOString();
    
    // Traditional conversation state update
    this.conversationState.contextHistory.push({
      questionId: question.id,
      question,
      answer,
      aiInsights: this.extractInsightsFromAnswer(answer),
      timestamp: now
    });

    // Limit history size
    if (this.conversationState.contextHistory.length > 10) {
      this.conversationState.contextHistory = this.conversationState.contextHistory.slice(-10);
    }

    // NEW: Capture context entry for the dual-context system
    if (answer && answer !== 'skipped' && typeof answer === 'string' && answer.trim().length > 0) {
      try {
        await dualContextService.addContextEntry(
          this.formConfig.id,
          'user_response',
          answer,
          {
            questionId: question.id,
            responseLength: answer.length,
            engagementScore: this.calculateResponseEngagement(answer),
            userReaction: this.classifyUserReaction(answer)
          }
        );

        // Refresh form context after adding new data
        this.formContext = await dualContextService.getCachedFormContext(this.formConfig.id);
      } catch (error) {
        console.error('Error adding context entry:', error);
        // Continue without context if this fails
      }
    }

    this.updateMetrics(answer);
  }

  /**
   * Classify user reaction to help AI understand engagement
   */
  private classifyUserReaction(answer: string): 'loved' | 'liked' | 'neutral' | 'skipped' | 'abandoned' {
    if (answer === 'skipped') return 'skipped';
    if (!answer || answer.trim().length === 0) return 'abandoned';
    
    const lowerAnswer = answer.toLowerCase();
    if (lowerAnswer.includes('love') || lowerAnswer.includes('perfect') || lowerAnswer.includes('exactly')) {
      return 'loved';
    }
    if (lowerAnswer.includes('like') || lowerAnswer.includes('good') || lowerAnswer.includes('yes')) {
      return 'liked';
    }
    
    return 'neutral';
  }

  /**
   * Calculate engagement score for a response
   */
  private calculateResponseEngagement(answer: string): number {
    let score = 50; // Base score
    
    // Length factor
    if (answer.length > 100) score += 30;
    else if (answer.length > 50) score += 20;
    else if (answer.length < 10) score -= 20;
    
    // Enthusiasm indicators
    if (answer.includes('!')) score += 10;
    if (answer.toLowerCase().includes('excit') || answer.toLowerCase().includes('love')) score += 15;
    
    // Detailed response indicators
    if (answer.includes('because') || answer.includes('reason')) score += 20;
    if (answer.includes('example') || answer.includes('instance')) score += 15;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate AI decision using dual-context intelligence
   * This is the core intelligence that makes the AI behave like a real product strategist
   */
  private async generateDualContextDecision(
    currentQuestion: Question, 
    userAnswer: any, 
    allAnswers: Record<string, any>
  ): Promise<DualContextAIDecision> {
    
    const metrics = this.conversationState.conversationMetrics;
    
    // Check if we should conclude early
    if (metrics.engagementScore < 30 || this.conversationState.contextHistory.length > 15) {
      return {
        action: 'conclude',
        reasoning: 'User engagement is low or conversation is getting too long',
        confidence: 0.9,
        contextUsed: {
          manifestoInfluence: 0,
          formContextInfluence: 0,
          noveltyScore: 0
        },
        expectedOutcome: {
          informationGain: 0,
          engagementPrediction: 20,
          productRelevance: 0
        }
      };
    }

    // Determine if we should generate a context-aware follow-up
    const shouldGenerateFollowUp = this.shouldGenerateContextualFollowUp(currentQuestion, userAnswer);
    
    if (shouldGenerateFollowUp) {
      const contextAwareQuestion = await this.generateContextAwareQuestion(
        currentQuestion,
        userAnswer,
        allAnswers
      );
      
      if (contextAwareQuestion) {
        return {
          action: 'generate_contextual_followup',
          nextQuestion: contextAwareQuestion,
          reasoning: `Generated contextual follow-up using dual-context intelligence: ${contextAwareQuestion.generationContext.triggeredBy}`,
          confidence: 0.85,
          contextUsed: {
            manifestoInfluence: this.userManifestoContext ? 70 : 0,
            formContextInfluence: this.formContext ? 60 : 0,
            noveltyScore: 80
          },
          expectedOutcome: {
            informationGain: 85,
            engagementPrediction: 80,
            productRelevance: 90
          }
        };
      }
    }

    // Check for pivot opportunities based on context
    const pivotOpportunity = this.assessPivotOpportunity(userAnswer, allAnswers);
    if (pivotOpportunity.shouldPivot) {
      return {
        action: 'pivot_conversation',
        reasoning: pivotOpportunity.reasoning,
        confidence: 0.7,
        contextUsed: {
          manifestoInfluence: this.userManifestoContext ? 50 : 0,
          formContextInfluence: this.formContext ? 70 : 0,
          noveltyScore: 60
        },
        expectedOutcome: {
          informationGain: 70,
          engagementPrediction: 75,
          productRelevance: 80
        }
      };
    }

    // Default: continue with enhanced awareness
    return {
      action: 'continue',
      reasoning: 'Continuing with standard form flow, but with enhanced context awareness',
      confidence: 0.6,
      contextUsed: {
        manifestoInfluence: this.userManifestoContext ? 30 : 0,
        formContextInfluence: this.formContext ? 30 : 0,
        noveltyScore: 40
      },
      expectedOutcome: {
        informationGain: 60,
        engagementPrediction: 65,
        productRelevance: 70
      }
    };
  }

  /**
   * Determine if we should generate a contextual follow-up
   * This uses both contexts to make smart decisions about follow-ups
   */
  private shouldGenerateContextualFollowUp(question: Question, answer: any): boolean {
    // Don't generate follow-ups for AI-generated questions
    if (question.isFollowUp || question.aiGenerated) return false;
    
    // Don't generate if answer is too short or skipped
    if (!answer || answer === 'skipped' || (typeof answer === 'string' && answer.length < 10)) {
      return false;
    }

    // Check if user manifesto context suggests this is a key area
    if (this.userManifestoContext && this.userManifestoContext.keyQuestionAreas.length > 0) {
      const questionText = question.label.toLowerCase();
      const isKeyArea = this.userManifestoContext.keyQuestionAreas.some(area => 
        questionText.includes(area.toLowerCase())
      );
      if (isKeyArea) return true;
    }

    // Check if form context suggests this type of question is successful
    if (this.formContext && this.formContext.successfulQuestionTypes.includes(question.type)) {
      return true;
    }

    // Check if user response shows high engagement
    if (typeof answer === 'string' && answer.length > 50) {
      const engagementScore = this.calculateResponseEngagement(answer);
      if (engagementScore > 70) return true;
    }

    return false;
  }

  /**
   * Generate a context-aware question using dual-context intelligence
   */
  private async generateContextAwareQuestion(
    currentQuestion: Question,
    userAnswer: any,
    allAnswers: Record<string, any>
  ): Promise<ContextAwareQuestion | null> {
    
    if (!this.userManifestoContext) return null;

    try {
      const request: DualContextQuestionRequest = {
        formId: this.formConfig.id,
        userManifesto: this.userManifestoContext,
        formContext: this.formContext || {
          formId: this.formConfig.id,
          totalEntries: 0,
          topThemes: [],
          userBehaviorPatterns: [],
          successfulQuestionTypes: [],
          commonUserPains: [],
          productInsights: [],
          conversationQuality: {
            avgEngagement: 0,
            completionRate: 0,
            avgResponseLength: 0,
            topPerformingQuestions: []
          },
          lastUpdated: new Date().toISOString()
        },
        currentConversation: this.conversationState,
        triggerReason: 'user_interest'
      };

      const generatedQuestion = await generateDualContextQuestion(request, currentQuestion, userAnswer);
      return generatedQuestion;
    } catch (error) {
      console.error('Error generating context-aware question:', error);
      return null;
    }
  }

  /**
   * Assess whether we should pivot the conversation based on context
   */
  private assessPivotOpportunity(userAnswer: any, allAnswers: Record<string, any>): {
    shouldPivot: boolean;
    reasoning: string;
  } {
    // Check if form context suggests a pivot
    if (this.formContext && this.formContext.commonUserPains.length > 0) {
      const answerText = typeof userAnswer === 'string' ? userAnswer.toLowerCase() : '';
      const mentionsPain = this.formContext.commonUserPains.some(pain => 
        answerText.includes(pain.toLowerCase())
      );
      
      if (mentionsPain) {
        return {
          shouldPivot: true,
          reasoning: 'User mentioned a common pain point - pivoting to explore this area'
        };
      }
    }

    return { shouldPivot: false, reasoning: '' };
  }

  /**
   * Extract insights from answers (enhanced with context awareness)
   */
  private extractInsightsFromAnswer(answer: any): string[] {
    const insights: string[] = [];
    
    if (typeof answer === 'string') {
      if (answer.length > 100) insights.push('detailed_response');
      else if (answer.length < 10) insights.push('brief_response');
      
      if (answer.includes('!')) insights.push('enthusiastic');
      if (answer.toLowerCase().includes('not sure')) insights.push('uncertain');
      
      // Enhanced context-aware insights
      if (this.userManifestoContext) {
        // Check if answer aligns with manifesto goals
        const manifestoKeywords = [
          ...this.userManifestoContext.businessGoals,
          ...this.userManifestoContext.coreValues,
          ...this.userManifestoContext.keyQuestionAreas
        ].join(' ').toLowerCase();
        
        if (manifestoKeywords && answer.toLowerCase().includes(manifestoKeywords)) {
          insights.push('manifesto_aligned');
        }
      }
    }
    
    if (answer === 'skipped') insights.push('disengaged');
    
    return insights;
  }

  /**
   * Enhanced metrics calculation with dual-context awareness
   */
  private updateMetrics(answer: any) {
    const history = this.conversationState.contextHistory;
    
    // Traditional metrics
    const textAnswers = history
      .filter(h => typeof h.answer === 'string' && h.answer !== 'skipped')
      .map(h => h.answer.length);
    
    if (textAnswers.length > 0) {
      this.conversationState.conversationMetrics.avgResponseLength = 
        textAnswers.reduce((sum, len) => sum + len, 0) / textAnswers.length;
    }
    
    const totalAnswers = history.length;
    const skippedAnswers = history.filter(h => h.answer === 'skipped').length;
    this.conversationState.conversationMetrics.skipRate = 
      totalAnswers > 0 ? (skippedAnswers / totalAnswers) * 100 : 0;
    
    this.calculateEngagementScore();
  }

  /**
   * Enhanced engagement calculation with dual-context insights
   */
  private calculateEngagementScore() {
    const metrics = this.conversationState.conversationMetrics;
    let score = 100;
    
    // Traditional scoring
    score -= metrics.skipRate * 2;
    
    if (metrics.avgResponseLength > 50) score += 10;
    else if (metrics.avgResponseLength < 15) score -= 15;
    
    const recentInsights = this.conversationState.contextHistory
      .slice(-3)
      .flatMap(h => h.aiInsights);
    
    if (recentInsights.includes('disengaged')) score -= 20;
    if (recentInsights.includes('enthusiastic')) score += 15;
    
    // NEW: Dual-context scoring bonus
    if (recentInsights.includes('manifesto_aligned')) score += 10;
    if (this.formContext && this.formContext.conversationQuality.avgEngagement > 70) {
      score += 5; // Bonus for forms with historically good engagement
    }
    
    this.conversationState.conversationMetrics.engagementScore = Math.max(0, Math.min(100, score));
    
    // Update engagement level
    const personality = this.conversationState.userPersonality;
    if (score < 50) personality.engagementLevel = 'low';
    else if (score < 75) personality.engagementLevel = 'medium';
    else personality.engagementLevel = 'high';
  }

  private analyzeUserBehavior() {
    const history = this.conversationState.contextHistory;
    const personality = this.conversationState.userPersonality;
    
    // Analyze communication style
    const recentAnswers = history.slice(-3);
    const avgLength = recentAnswers
      .filter(h => typeof h.answer === 'string')
      .reduce((sum, h) => sum + h.answer.length, 0) / Math.max(1, recentAnswers.length);
    
    if (avgLength > 100) personality.communicationStyle = 'detailed';
    else if (avgLength > 30) personality.communicationStyle = 'analytical';
    else personality.communicationStyle = 'brief';
  }

  /**
   * Get conversation insights enhanced with dual-context data
   */
  getEnhancedConversationInsights() {
    return {
      conversationState: this.conversationState,
      userManifestoContext: this.userManifestoContext,
      formContext: this.formContext,
      contextUtilization: {
        manifestoLoaded: !!this.userManifestoContext,
        formContextLoaded: !!this.formContext,
        totalContextEntries: this.formContext?.totalEntries || 0,
        topThemes: this.formContext?.topThemes || []
      }
    };
  }
}

export function createEnhancedFormBrain(formSchema: FormSchema): EnhancedFormBrain {
  return new EnhancedFormBrain(formSchema);
} 