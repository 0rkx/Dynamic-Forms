import { 
  FormContextEntry, 
  CachedFormContext, 
  UserManifestoContext, 
  DualContextQuestionRequest,
  ContextAwareQuestion
} from '../types';
import { supabaseService } from './supabaseService';

/**
 * Dual-Context Service
 * Manages both User Manifesto Context and Form Context (Auto-Cached Context)
 * This is the core service that enables smart, context-aware question generation
 */
class DualContextService {
  
  // =============================================
  // FORM CONTEXT MANAGEMENT (Auto-Cached Context)
  // =============================================

  /**
   * Add a context entry (user response, AI insight, etc.)
   * This automatically triggers cache updates for smarter AI decisions
   */
  async addContextEntry(
    formId: string,
    entryType: FormContextEntry['entryType'],
    content: string,
    metadata: FormContextEntry['metadata'] = {},
    aiAnalysis?: FormContextEntry['aiAnalysis']
  ): Promise<string> {
    try {
      // If no AI analysis provided, generate it
      if (!aiAnalysis) {
        aiAnalysis = await this.analyzeContent(content, entryType);
      }

      const { data, error } = await supabaseService.client
        .rpc('add_form_context_entry', {
          target_form_id: formId,
          entry_type: entryType,
          content: content,
          metadata: metadata,
          ai_analysis: aiAnalysis
        });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding context entry:', error);
      throw new Error('Failed to add context entry');
    }
  }

  /**
   * Get cached form context for AI decision making
   * This is the queryable knowledge base the AI uses
   */
  async getCachedFormContext(formId: string): Promise<CachedFormContext | null> {
    try {
      const { data, error } = await supabaseService.client
        .from('cached_form_context')
        .select('*')
        .eq('form_id', formId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (!data) return null;

      return {
        formId: data.form_id,
        totalEntries: data.total_entries,
        topThemes: data.top_themes || [],
        userBehaviorPatterns: data.user_behavior_patterns || [],
        successfulQuestionTypes: data.successful_question_types || [],
        commonUserPains: data.common_user_pains || [],
        productInsights: data.product_insights || [],
        conversationQuality: data.conversation_quality || {
          avgEngagement: 0,
          completionRate: 0,
          avgResponseLength: 0,
          topPerformingQuestions: []
        },
        lastUpdated: data.last_updated
      };
    } catch (error) {
      console.error('Error fetching cached form context:', error);
      return null;
    }
  }

  /**
   * Analyze user response and extract AI insights
   * This is where the magic happens - turning responses into queryable insights
   */
  private async analyzeContent(
    content: string,
    entryType: FormContextEntry['entryType']
  ): Promise<FormContextEntry['aiAnalysis']> {
    // Basic analysis - in production, this would use more sophisticated AI
    const keyThemes = this.extractKeyThemes(content);
    const emotionalTone = this.detectEmotionalTone(content);
    const informationRichness = this.calculateInformationRichness(content);
    const followUpPotential = this.assessFollowUpPotential(content, entryType);
    const productRelevance = this.assessProductRelevance(content);

    return {
      keyThemes,
      emotionalTone,
      informationRichness,
      followUpPotential,
      productRelevance
    };
  }

  private extractKeyThemes(content: string): string[] {
    const themes: string[] = [];
    const lowerContent = content.toLowerCase();
    
    // Product-related themes
    if (lowerContent.includes('price') || lowerContent.includes('cost') || lowerContent.includes('budget')) {
      themes.push('pricing_concern');
    }
    if (lowerContent.includes('feature') || lowerContent.includes('functionality')) {
      themes.push('feature_interest');
    }
    if (lowerContent.includes('problem') || lowerContent.includes('pain') || lowerContent.includes('frustrat')) {
      themes.push('user_pain_point');
    }
    if (lowerContent.includes('user') || lowerContent.includes('customer') || lowerContent.includes('client')) {
      themes.push('user_focused');
    }
    if (lowerContent.includes('competitor') || lowerContent.includes('alternative')) {
      themes.push('competitive_concern');
    }
    
    return themes;
  }

  private detectEmotionalTone(content: string): string {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('!') || lowerContent.includes('excit') || lowerContent.includes('love') || lowerContent.includes('great')) {
      return 'enthusiastic';
    }
    if (lowerContent.includes('concern') || lowerContent.includes('worry') || lowerContent.includes('problem')) {
      return 'concerned';
    }
    if (lowerContent.includes('not sure') || lowerContent.includes('maybe') || lowerContent.includes('uncertain')) {
      return 'uncertain';
    }
    
    return 'neutral';
  }

  private calculateInformationRichness(content: string): number {
    // Score 0-100 based on content depth
    let score = 0;
    
    score += Math.min(50, content.length / 10); // Length factor
    score += (content.split(' ').length > 20) ? 25 : 0; // Detail factor
    score += (content.includes('because') || content.includes('since') || content.includes('reason')) ? 15 : 0; // Reasoning factor
    score += (content.includes('example') || content.includes('instance')) ? 10 : 0; // Example factor
    
    return Math.min(100, score);
  }

  private assessFollowUpPotential(content: string, entryType: string): number {
    let score = 0;
    
    if (entryType === 'user_response') {
      score += 50; // User responses have inherent follow-up potential
      
      if (content.length > 100) score += 30; // Detailed responses invite more questions
      if (this.detectEmotionalTone(content) === 'enthusiastic') score += 20; // Enthusiasm suggests engagement
    }
    
    return Math.min(100, score);
  }

  private assessProductRelevance(content: string): number {
    const themes = this.extractKeyThemes(content);
    let score = 0;
    
    // Product-focused themes get higher relevance
    if (themes.includes('feature_interest')) score += 30;
    if (themes.includes('user_pain_point')) score += 40;
    if (themes.includes('pricing_concern')) score += 25;
    if (themes.includes('competitive_concern')) score += 20;
    
    return Math.min(100, score);
  }

  // =============================================
  // USER MANIFESTO CONTEXT MANAGEMENT
  // =============================================

  /**
   * Save or update user manifesto context
   * This is the explicit context users provide about their product
   */
  async saveManifestoContext(
    formId: string,
    manifestoContext: Omit<UserManifestoContext, 'conversationTone'> & { conversationTone?: UserManifestoContext['conversationTone'] }
  ): Promise<void> {
    try {
      const { error } = await supabaseService.client
        .from('user_manifesto_context')
        .upsert({
          form_id: formId,
          product_vision: manifestoContext.productVision,
          target_audience: manifestoContext.targetAudience,
          core_values: manifestoContext.coreValues,
          business_goals: manifestoContext.businessGoals,
          key_question_areas: manifestoContext.keyQuestionAreas,
          conversation_tone: manifestoContext.conversationTone || 'friendly',
          success_metrics: manifestoContext.successMetrics,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving manifesto context:', error);
      throw new Error('Failed to save manifesto context');
    }
  }

  /**
   * Get user manifesto context
   */
  async getManifestoContext(formId: string): Promise<UserManifestoContext | null> {
    try {
      const { data, error } = await supabaseService.client
        .from('user_manifesto_context')
        .select('*')
        .eq('form_id', formId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (!data) return null;

      return {
        productVision: data.product_vision,
        targetAudience: data.target_audience,
        coreValues: data.core_values || [],
        businessGoals: data.business_goals || [],
        keyQuestionAreas: data.key_question_areas || [],
        conversationTone: data.conversation_tone,
        successMetrics: data.success_metrics || []
      };
    } catch (error) {
      console.error('Error fetching manifesto context:', error);
      return null;
    }
  }

  /**
   * Parse manifesto from simple text to structured context
   * This helps users who just provide a simple manifesto text
   */
  parseManifestoText(manifestoText: string): Partial<UserManifestoContext> {
    // Basic parsing - in production, this would use AI
    const lines = manifestoText.split('\n').filter(line => line.trim());
    
    let productVision = '';
    let targetAudience = '';
    let coreValues: string[] = [];
    let businessGoals: string[] = [];
    
    // Simple heuristic parsing
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      if (lowerLine.includes('goal') || lowerLine.includes('objective')) {
        businessGoals.push(line.trim());
      } else if (lowerLine.includes('user') || lowerLine.includes('customer') || lowerLine.includes('audience')) {
        targetAudience = line.trim();
      } else if (lowerLine.includes('value') || lowerLine.includes('principle')) {
        coreValues.push(line.trim());
      } else if (!productVision && line.length > 20) {
        productVision = line.trim();
      }
    }
    
    return {
      productVision: productVision || manifestoText.split('\n')[0] || '',
      targetAudience: targetAudience || 'Product users',
      coreValues,
      businessGoals
    };
  }

  // =============================================
  // CONTEXT INSIGHTS & ANALYTICS
  // =============================================

  /**
   * Get insights about how the dual-context system is performing
   */
  async getContextInsights(formId: string): Promise<{
    manifestoUtilization: number;
    contextRichness: number;
    aiEffectiveness: number;
    recommendations: string[];
  }> {
    const [manifestoContext, formContext] = await Promise.all([
      this.getManifestoContext(formId),
      this.getCachedFormContext(formId)
    ]);

    let manifestoUtilization = 0;
    let contextRichness = 0;
    let aiEffectiveness = 0;
    const recommendations: string[] = [];

    // Analyze manifesto utilization
    if (manifestoContext) {
      manifestoUtilization = 
        (manifestoContext.productVision ? 25 : 0) +
        (manifestoContext.targetAudience ? 20 : 0) +
        (manifestoContext.coreValues.length > 0 ? 20 : 0) +
        (manifestoContext.businessGoals.length > 0 ? 20 : 0) +
        (manifestoContext.keyQuestionAreas.length > 0 ? 15 : 0);
    } else {
      recommendations.push('Set up your product manifesto to guide AI question generation');
    }

    // Analyze context richness
    if (formContext) {
      contextRichness = Math.min(100, 
        formContext.totalEntries * 10 + 
        formContext.topThemes.length * 5 +
        formContext.conversationQuality.avgEngagement
      );
      
      if (formContext.totalEntries < 5) {
        recommendations.push('Collect more user responses to improve AI context understanding');
      }
    }

    // Analyze AI effectiveness
    if (formContext && formContext.conversationQuality.avgEngagement > 0) {
      aiEffectiveness = formContext.conversationQuality.avgEngagement;
      
      if (aiEffectiveness < 60) {
        recommendations.push('Consider adjusting conversation tone or question types');
      }
    }

    return {
      manifestoUtilization,
      contextRichness,
      aiEffectiveness,
      recommendations
    };
  }
}

export const dualContextService = new DualContextService(); 