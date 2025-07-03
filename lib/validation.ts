import { z } from 'zod';

// Base validation schemas
export const questionTypeSchema = z.enum([
  'text',
  'textarea', 
  'multiple-choice',
  'rating',
  'email',
  'welcome'
]);

export const questionLogicSchema = z.object({
  onValue: z.string().min(1, 'Logic condition value is required'),
  goToQuestionId: z.string().min(1, 'Target question ID is required')
});

export const questionOptionSchema = z.object({
  value: z.string().min(1, 'Option value is required'),
  label: z.string().min(1, 'Option label is required')
});

// Question validation schema
export const questionSchema = z.object({
  id: z.string().min(1, 'Question ID is required'),
  type: questionTypeSchema,
  label: z.string().min(1, 'Question label is required').max(500, 'Question label too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  options: z.array(questionOptionSchema).optional(),
  required: z.boolean().optional(),
  logic: z.array(questionLogicSchema).optional(),
  min: z.number().int().min(1).optional(),
  max: z.number().int().max(10).optional(), 
  minLabel: z.string().max(50, 'Min label too long').optional(),
  maxLabel: z.string().max(50, 'Max label too long').optional(),
}).superRefine((data, ctx) => {
  // Validate multiple-choice questions have options
  if (data.type === 'multiple-choice') {
    if (!data.options || data.options.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Multiple-choice questions must have at least one option',
        path: ['options']
      });
    }
  }
  
  // Validate rating questions have min/max
  if (data.type === 'rating') {
    if (data.min === undefined || data.max === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Rating questions must have min and max values',
        path: ['min', 'max']
      });
    } else if (data.min >= data.max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Min value must be less than max value',
        path: ['min']
      });
    }
  }
  
  // Validate logic references valid questions
  if (data.logic) {
    for (const logic of data.logic) {
      if (logic.goToQuestionId === data.id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Question logic cannot reference itself',
          path: ['logic']
        });
      }
    }
  }
});

// Form schema validation
export const formSchema = z.object({
  id: z.string().min(1, 'Form ID is required'),
  title: z.string().min(1, 'Form title is required').max(200, 'Title too long'),
  description: z.string().min(1, 'Form description is required').max(1000, 'Description too long'),
  manifesto: z.string().max(2000, 'Manifesto too long').optional(),
  questions: z.array(questionSchema).min(1, 'Form must have at least one question').max(50, 'Too many questions'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  views: z.number().int().min(0),
  intelligentFollowUps: z.boolean().optional(),
  ownerId: z.string().optional()
}).superRefine((data, ctx) => {
  // Validate first question is welcome type
  if (data.questions.length > 0 && data.questions[0].type !== 'welcome') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'First question must be of type "welcome"',
      path: ['questions', 0, 'type']
    });
  }
  
  // Validate unique question IDs
  const questionIds = data.questions.map(q => q.id);
  const uniqueIds = new Set(questionIds);
  if (questionIds.length !== uniqueIds.size) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'All question IDs must be unique',
      path: ['questions']
    });
  }
  
  // Validate logic references point to valid questions
  for (let i = 0; i < data.questions.length; i++) {
    const question = data.questions[i];
    if (question.logic) {
      for (const logic of question.logic) {
        if (!questionIds.includes(logic.goToQuestionId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Logic references non-existent question: ${logic.goToQuestionId}`,
            path: ['questions', i, 'logic']
          });
        }
      }
    }
  }
});

// Response validation schemas
export const textResponseSchema = z.object({
  questionId: z.string().min(1),
  type: z.literal('text'),
  value: z.string().max(2000, 'Response too long')
});

export const textareaResponseSchema = z.object({
  questionId: z.string().min(1),
  type: z.literal('textarea'),
  value: z.string().max(5000, 'Response too long')
});

export const emailResponseSchema = z.object({
  questionId: z.string().min(1),
  type: z.literal('email'),
  value: z.string().email('Invalid email format').max(254, 'Email too long')
});

export const multipleChoiceResponseSchema = z.object({
  questionId: z.string().min(1),
  type: z.literal('multiple-choice'),
  value: z.string().min(1, 'Please select an option')
});

export const ratingResponseSchema = z.object({
  questionId: z.string().min(1),
  type: z.literal('rating'),
  value: z.number().int().min(1).max(10)
});

export const responseSchema = z.discriminatedUnion('type', [
  textResponseSchema,
  textareaResponseSchema,
  emailResponseSchema,
  multipleChoiceResponseSchema,
  ratingResponseSchema
]);

export const formResponseSchema = z.object({
  formId: z.string().min(1, 'Form ID is required'),
  responses: z.array(responseSchema).min(1, 'At least one response is required'),
  submittedAt: z.date().default(() => new Date()),
  userAgent: z.string().optional(),
  ipAddress: z.string().ip().optional()
});

// Input sanitization helpers
export function sanitizeHtml(input: string): string {
  // Basic HTML sanitization - remove script tags and event handlers
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\bon\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\bon\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
}

export function sanitizeInput(input: unknown): string {
  if (typeof input !== 'string') {
    return '';
  }
  return sanitizeHtml(input).slice(0, 10000); // Max length cap
}

// Validation helpers
export function validateFormData(data: unknown) {
  try {
    return formSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join('; ');
      throw new Error(`Form validation failed: ${errorMessages}`);
    }
    throw new Error('Invalid form data format');
  }
}

export function validateResponse(data: unknown) {
  try {
    return responseSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join('; ');
      throw new Error(`Response validation failed: ${errorMessages}`);
    }
    throw new Error('Invalid response data format');
  }
}

export function validateFormResponse(data: unknown) {
  try {
    return formResponseSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join('; ');
      throw new Error(`Form response validation failed: ${errorMessages}`);
    }
    throw new Error('Invalid form response data format');
  }
}

// Data normalization helpers
export function normalizeQuestionData(question: any): any {
  if (!question || typeof question !== 'object') {
    return question;
  }

  const normalized = { ...question };

  // Fix question type naming
  if (normalized.type === 'multiple_choice') {
    normalized.type = 'multiple-choice';
  }

  // Fix null/undefined description
  if (normalized.description === null || normalized.description === undefined) {
    normalized.description = '';
  }

  // Fix options that are strings instead of objects
  if (normalized.options && Array.isArray(normalized.options)) {
    normalized.options = normalized.options.map((option: any, index: number) => {
      if (typeof option === 'string') {
        return {
          value: option.toLowerCase().replace(/\s+/g, '_'),
          label: option
        };
      }
      if (typeof option === 'object' && option !== null) {
        // Ensure option has both value and label
        return {
          value: option.value || `option_${index}`,
          label: option.label || option.value || `Option ${index + 1}`
        };
      }
      return {
        value: `option_${index}`,
        label: `Option ${index + 1}`
      };
    });
  }

  // Ensure required fields have defaults
  if (!normalized.id) {
    normalized.id = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  if (!normalized.label) {
    normalized.label = 'Question';
  }

  return normalized;
}

export function normalizeFormData(formData: any): any {
  if (!formData || typeof formData !== 'object') {
    return formData;
  }

  const normalized = { ...formData };

  // Normalize questions
  if (normalized.questions && Array.isArray(normalized.questions)) {
    normalized.questions = normalized.questions.map(normalizeQuestionData);
  }

  // Ensure required form fields
  if (!normalized.id) {
    normalized.id = `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  if (!normalized.title) {
    normalized.title = 'Untitled Form';
  }

  if (!normalized.description) {
    normalized.description = 'Form description';
  }

  if (!normalized.createdAt) {
    normalized.createdAt = new Date().toISOString();
  }

  if (!normalized.updatedAt) {
    normalized.updatedAt = new Date().toISOString();
  }

  if (normalized.views === undefined || normalized.views === null) {
    normalized.views = 0;
  }

  return normalized;
}

// Auto-retry validation with normalization
export async function validateFormDataWithRetry(data: unknown, maxRetries: number = 3): Promise<any> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // First attempt: try direct validation
      if (attempt === 1) {
        return formSchema.parse(data);
      }
      
      // Subsequent attempts: normalize data first
      const normalizedData = normalizeFormData(data);
      return formSchema.parse(normalizedData);
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Form validation attempt ${attempt} failed:`, error);
      
      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        if (error instanceof z.ZodError) {
          const errorMessages = error.errors.map(err => 
            `${err.path.join('.')}: ${err.message}`
          ).join('; ');
          throw new Error(`Form validation failed after ${maxRetries} attempts: ${errorMessages}`);
        }
        throw new Error(`Form validation failed after ${maxRetries} attempts: ${lastError.message}`);
      }
      
      // Wait a bit before retrying (exponential backoff)
      const delay = Math.min(100 * Math.pow(2, attempt - 1), 1000);
      if (typeof window !== 'undefined') {
        // Browser environment - use setTimeout
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Form validation failed');
}

// Separate manifesto parsing function
export function parseManifesto(manifestoText: string): {
  productVision: string;
  targetAudience: string;
  keyQuestionAreas: string[];
  businessGoals: string[];
  conversationTone: string;
} {
  if (!manifestoText || typeof manifestoText !== 'string') {
    return {
      productVision: '',
      targetAudience: '',
      keyQuestionAreas: [],
      businessGoals: [],
      conversationTone: 'friendly'
    };
  }

  const lines = manifestoText.split('\n').filter(line => line.trim());
  
  // Extract product vision (first line)
  const productVision = lines[0] || '';
  
  // Extract target audience
  const targetAudienceLine = lines.find(line => line.startsWith('Target Audience:'));
  const targetAudience = targetAudienceLine ? targetAudienceLine.replace('Target Audience:', '').trim() : '';
  
  // Extract key question areas
  const keyAreasLine = lines.find(line => line.startsWith('Key Question Areas:'));
  const keyQuestionAreas = keyAreasLine ? 
    keyAreasLine.replace('Key Question Areas:', '').split(',').map(area => area.trim()).filter(area => area) : 
    [];
  
  // Extract business goals
  const businessGoalsLine = lines.find(line => line.startsWith('Business Goals:'));
  const businessGoals = businessGoalsLine ? 
    businessGoalsLine.replace('Business Goals:', '').split(',').map(goal => goal.trim()).filter(goal => goal) : 
    [];
  
  // Extract conversation tone
  const toneLine = lines.find(line => line.startsWith('Conversation Tone:'));
  const conversationTone = toneLine ? 
    toneLine.replace('Conversation Tone:', '').trim().toLowerCase() : 
    'friendly';

  return {
    productVision,
    targetAudience,
    keyQuestionAreas,
    businessGoals,
    conversationTone
  };
}

// Separate questions parsing function
export function parseQuestions(questionsData: any[]): any[] {
  if (!Array.isArray(questionsData)) {
    return [];
  }

  return questionsData.map((question, index) => {
    const normalized = normalizeQuestionData(question);
    
    // Ensure first question is welcome type
    if (index === 0 && normalized.type !== 'welcome') {
      normalized.type = 'welcome';
      normalized.label = normalized.label || 'Welcome!';
      normalized.description = normalized.description || 'Thank you for taking the time to complete this form.';
    }
    
    return normalized;
  });
} 