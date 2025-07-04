import { FormSchema } from '../types';
import { createEnhancedFormBrain } from './enhancedFormBrain';

/**
 * FormBrain Migration Utility
 * 
 * This utility seamlessly migrates forms from the old FormBrain to the new
 * dual-context enhanced FormBrain, solving the production-critical AI question issue.
 */

/**
 * Create the appropriate FormBrain based on whether dual-context is enabled
 * This is the main function to use instead of directly calling createFormBrain
 */
export function createSmartFormBrain(formSchema: FormSchema) {
  // Always return the enhanced dual-context brain.
  // Legacy FormBrain has been retired to simplify maintenance.
  console.log('🧠 [Enhanced] FormBrain activated for:', formSchema.title);
  return createEnhancedFormBrain(formSchema);
}

/**
 * Check if a form should be migrated to dual-context
 */
export function shouldMigrateToDualContext(formSchema: FormSchema): {
  shouldMigrate: boolean;
  reason: string;
  benefits: string[];
} {
  // Already using enhanced system
  if (formSchema.intelligentFollowUps) {
    return {
      shouldMigrate: false,
      reason: 'Already using dual-context system',
      benefits: []
    };
  }

  const benefits = [];
  let shouldMigrate = false;

  // Check if form has a manifesto (key indicator for smart questions)
  if (formSchema.manifesto && formSchema.manifesto.trim().length > 50) {
    shouldMigrate = true;
    benefits.push('Has detailed manifesto that can guide AI question generation');
  }

  // Check if form has open-ended questions (good for follow-ups)
  const hasOpenEndedQuestions = formSchema.questions.some(q => 
    q.type === 'textarea' || q.type === 'text'
  );
  if (hasOpenEndedQuestions) {
    shouldMigrate = true;
    benefits.push('Has open-ended questions perfect for intelligent follow-ups');
  }

  // Check if form is complex enough to benefit from context
  if (formSchema.questions.length >= 5) {
    shouldMigrate = true;
    benefits.push('Has enough questions to benefit from conversation context');
  }

  // Check if form seems product-focused
  const formText = [formSchema.title, formSchema.description, formSchema.manifesto || ''].join(' ').toLowerCase();
  const productKeywords = ['product', 'feature', 'user', 'customer', 'business', 'startup', 'service'];
  const hasProductFocus = productKeywords.some(keyword => formText.includes(keyword));
  
  if (hasProductFocus) {
    shouldMigrate = true;
    benefits.push('Appears to be product-focused - ideal for strategic questioning');
  }

  const reason = shouldMigrate 
    ? 'Form would benefit significantly from dual-context AI intelligence'
    : 'Form may not need advanced AI features yet';

  return {
    shouldMigrate,
    reason,
    benefits
  };
}

/**
 * Get migration recommendations for a form
 */
export function getMigrationRecommendations(formSchema: FormSchema): {
  priority: 'high' | 'medium' | 'low';
  actions: string[];
  expectedImprovements: string[];
} {
  const analysis = shouldMigrateToDualContext(formSchema);
  
  if (!analysis.shouldMigrate) {
    return {
      priority: 'low',
      actions: ['Consider adding a detailed manifesto to unlock AI intelligence'],
      expectedImprovements: []
    };
  }

  const actions = [];
  const expectedImprovements = [];

  // High priority recommendations
  if (formSchema.manifesto && formSchema.manifesto.trim().length > 20) {
    actions.push('Enable dual-context AI system immediately');
    expectedImprovements.push('AI will generate contextual follow-up questions based on your manifesto');
  } else {
    actions.push('Add a detailed product manifesto first');
    actions.push('Enable dual-context AI system after manifesto is complete');
  }

  // Medium priority enhancements
  actions.push('Review existing questions to ensure they\'re AI-friendly');
  actions.push('Add key question areas to your manifesto for better AI targeting');

  // Expected improvements
  expectedImprovements.push('Reduced user drop-off through more engaging questions');
  expectedImprovements.push('Higher quality responses from contextually intelligent questions');
  expectedImprovements.push('Automatic learning from user conversations to improve future questions');

  const priority: 'high' | 'medium' | 'low' = 
    formSchema.manifesto && formSchema.manifesto.length > 50 ? 'high' : 'medium';

  return {
    priority,
    actions,
    expectedImprovements
  };
}

/**
 * Auto-migrate a form to dual-context if it meets criteria
 */
export function autoMigrateForm(formSchema: FormSchema): {
  migrated: boolean;
  newSchema: FormSchema;
  changes: string[];
} {
  const analysis = shouldMigrateToDualContext(formSchema);
  
  if (!analysis.shouldMigrate) {
    return {
      migrated: false,
      newSchema: formSchema,
      changes: []
    };
  }

  const changes = [];
  let newSchema = { ...formSchema };

  // Enable intelligent follow-ups
  if (!newSchema.intelligentFollowUps) {
    newSchema.intelligentFollowUps = true;
    changes.push('Enabled intelligent follow-ups');
  }

  // Add AI config if missing
  if (!newSchema.aiConfig) {
    newSchema.aiConfig = {
      enabled: true,
      conversationStyle: 'friendly',
      maxDynamicQuestions: 5,
      adaptationLevel: 'medium',
      personalityTraits: ['empathetic', 'curious']
    };
    changes.push('Added AI configuration with friendly, medium intelligence');
  }

  // Add conversation flow config if missing
  if (!newSchema.conversationFlow) {
    newSchema.conversationFlow = {
      allowSkipping: true,
      showProgress: true,
      enableBranching: true,
      smartTransitions: true
    };
    changes.push('Enabled smart conversation flow features');
  }

  return {
    migrated: changes.length > 0,
    newSchema,
    changes
  };
}

/**
 * Performance comparison between old and new brain
 */
export function compareFormBrainPerformance(): {
  oldBrainLimitations: string[];
  newBrainAdvantages: string[];
  productionImpact: string[];
} {
  return {
    oldBrainLimitations: [
      'Generic follow-up questions that don\'t align with product goals',
      'No understanding of conversation context or user intent',
      'Cannot learn from previous user interactions',
      'Limited ability to ask strategic, business-relevant questions',
      'High user drop-off due to irrelevant or repetitive questions'
    ],
    newBrainAdvantages: [
      'Uses product manifesto to generate strategically aligned questions',
      'Learns from conversation patterns to avoid repetition',
      'Builds queryable knowledge base from user interactions',
      'Asks contextually intelligent questions that feel human',
      'Adapts conversation style based on user engagement'
    ],
    productionImpact: [
      'Solves the critical AI question generation problem',
      'Reduces user abandonment through more engaging conversations',
      'Generates higher quality product insights from users',
      'Creates compound intelligence that improves over time',
      'Positions product as genuinely intelligent, not just automated'
    ]
  };
} 