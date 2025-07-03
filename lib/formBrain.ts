import { FormSchema, Question, QuestionType, ConversationState, AIBrainDecision } from '../types';
import { generateFormId } from './utils';

// Configuration for the AI Brain
const BRAIN_CONFIG = {
  maxContextHistory: 10,
  confidenceThreshold: 0.7,
  adaptationTriggers: {
    lowEngagement: 3,
    shortResponses: 5,
    skipPattern: 2
  }
};

class FormBrain {
  private conversationState: ConversationState;
  private formConfig: FormSchema;
  private originalSkeleton: Question[];

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

  // Main brain function that decides what to do next
  async decideNextAction(
    currentQuestion: Question, 
    userAnswer: any, 
    allAnswers: Record<string, any>
  ): Promise<AIBrainDecision> {
    
    this.updateConversationState(currentQuestion, userAnswer);
    this.analyzeUserBehavior();
    
    return await this.generateNextAction(currentQuestion, userAnswer, allAnswers);
  }

  private updateConversationState(question: Question, answer: any) {
    const now = new Date().toISOString();
    
    this.conversationState.contextHistory.push({
      questionId: question.id,
      question,
      answer,
      aiInsights: this.extractInsightsFromAnswer(answer),
      timestamp: now
    });

    if (this.conversationState.contextHistory.length > BRAIN_CONFIG.maxContextHistory) {
      this.conversationState.contextHistory = this.conversationState.contextHistory.slice(-BRAIN_CONFIG.maxContextHistory);
    }

    this.updateMetrics(answer);
  }

  private extractInsightsFromAnswer(answer: any): string[] {
    const insights: string[] = [];
    
    if (typeof answer === 'string') {
      if (answer.length > 100) insights.push('detailed_response');
      else if (answer.length < 10) insights.push('brief_response');
      
      if (answer.includes('!')) insights.push('enthusiastic');
      if (answer.toLowerCase().includes('not sure')) insights.push('uncertain');
    }
    
    if (answer === 'skipped') insights.push('disengaged');
    
    return insights;
  }

  private updateMetrics(answer: any) {
    const history = this.conversationState.contextHistory;
    
    // Update average response length
    const textAnswers = history
      .filter(h => typeof h.answer === 'string' && h.answer !== 'skipped')
      .map(h => h.answer.length);
    
    if (textAnswers.length > 0) {
      this.conversationState.conversationMetrics.avgResponseLength = 
        textAnswers.reduce((sum, len) => sum + len, 0) / textAnswers.length;
    }
    
    // Update skip rate
    const totalAnswers = history.length;
    const skippedAnswers = history.filter(h => h.answer === 'skipped').length;
    this.conversationState.conversationMetrics.skipRate = 
      totalAnswers > 0 ? (skippedAnswers / totalAnswers) * 100 : 0;
    
    this.calculateEngagementScore();
  }

  private calculateEngagementScore() {
    const metrics = this.conversationState.conversationMetrics;
    let score = 100;
    
    score -= metrics.skipRate * 2;
    
    if (metrics.avgResponseLength > 50) score += 10;
    else if (metrics.avgResponseLength < 15) score -= 15;
    
    const recentInsights = this.conversationState.contextHistory
      .slice(-3)
      .flatMap(h => h.aiInsights);
    
    if (recentInsights.includes('disengaged')) score -= 20;
    if (recentInsights.includes('enthusiastic')) score += 15;
    
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

  private async generateNextAction(
    currentQuestion: Question, 
    userAnswer: any, 
    allAnswers: Record<string, any>
  ): Promise<AIBrainDecision> {
    
    const metrics = this.conversationState.conversationMetrics;
    
    // Check if we should conclude early
    if (metrics.engagementScore < 30 || this.conversationState.contextHistory.length > 15) {
      return {
        action: 'conclude',
        reasoning: 'User engagement is low or conversation is getting too long',
        confidence: 0.9
      };
    }
    
    // Check if we should generate an intelligent follow-up
    if (this.shouldGenerateFollowUp(currentQuestion, userAnswer)) {
      const followUp = await this.generateIntelligentFollowUp(currentQuestion, userAnswer, allAnswers);
      if (followUp) {
        return {
          action: 'generate_followup',
          nextQuestion: followUp,
          reasoning: 'Generated contextual follow-up based on user response',
          confidence: 0.8
        };
      }
    }
    
    return {
      action: 'continue',
      reasoning: 'Continuing with standard form flow',
      confidence: 0.6
    };
  }

  private shouldGenerateFollowUp(question: Question, answer: any): boolean {
    if (question.isFollowUp || question.aiGenerated) return false;
    if (typeof answer === 'string' && answer.length > 50) return true;
    if (['textarea', 'multiple-choice', 'rating'].includes(question.type)) {
      return Math.random() > 0.7;
    }
    return false;
  }

  private async generateIntelligentFollowUp(
    question: Question, 
    answer: any, 
    allAnswers: Record<string, any>
  ): Promise<Question | null> {
    try {
      // Simple follow-up generation - would integrate with your AI service
      const followUpQuestions = [
        {
          type: 'text' as QuestionType,
          label: 'That\'s interesting! Can you tell me more about that?',
          placeholder: 'Feel free to elaborate...'
        },
        {
          type: 'quick-select' as QuestionType,
          label: 'How important is this to you?',
          options: [
            { value: 'very', label: 'Very important' },
            { value: 'somewhat', label: 'Somewhat important' },
            { value: 'not', label: 'Not very important' }
          ]
        }
      ];

      const randomFollowUp = followUpQuestions[Math.floor(Math.random() * followUpQuestions.length)];
      
      return {
        ...randomFollowUp,
        id: generateFormId(),
        isFollowUp: true,
        aiGenerated: true,
        originalQuestionId: question.id,
        conversationContext: this.conversationState.currentThread
      };
    } catch (error) {
      console.error('Error generating intelligent follow-up:', error);
      return null;
    }
  }

  getConversationInsights() {
    return {
      personalityProfile: this.conversationState.userPersonality,
      engagementMetrics: this.conversationState.conversationMetrics,
      recommendations: this.generateRecommendations()
    };
  }

  private generateRecommendations(): string[] {
    const metrics = this.conversationState.conversationMetrics;
    const personality = this.conversationState.userPersonality;
    const recommendations: string[] = [];
    
    if (metrics.engagementScore < 50) {
      recommendations.push('Consider shorter, more interactive questions');
    }
    
    if (personality.communicationStyle === 'brief') {
      recommendations.push('Use quick-select options instead of text areas');
    }
    
    if (metrics.skipRate > 20) {
      recommendations.push('Questions may be too complex or irrelevant');
    }
    
    return recommendations;
  }
}

// Factory function to create a new brain instance
export function createFormBrain(formSchema: FormSchema): FormBrain {
  return new FormBrain(formSchema);
}

// Export the brain class for advanced usage
export { FormBrain }; 