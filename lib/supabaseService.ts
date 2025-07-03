import { supabase } from './supabase';
import { FormSchema, FormResponse, FormManifesto } from '../types';
import { User } from '@supabase/supabase-js';

export class SupabaseService {
  private connectionVerified = false;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // ms

  /**
   * Verify database connection
   */
  async verifyConnection(): Promise<boolean> {
    try {
      const { error } = await supabase.from('forms').select('count').limit(1);
      this.connectionVerified = !error;
      return this.connectionVerified;
    } catch (error) {
      console.error('Database connection failed:', error);
      this.connectionVerified = false;
      return false;
    }
  }

  /**
   * Retry logic for database operations
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    retries = this.maxRetries
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0) {
        console.warn(`Operation failed, retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.retryOperation(operation, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Enhanced error handling
   */
  private handleError(error: any, operation: string): never {
    console.error(`${operation} failed:`, error);
    
    if (error.code === 'PGRST301') {
      throw new Error('Database connection lost. Please check your internet connection.');
    }
    
    if (error.code === '42P01') {
      throw new Error('Database table not found. Please check your database setup.');
    }

    if (error.message?.includes('JWT')) {
      throw new Error('Authentication expired. Please sign in again.');
    }

    throw new Error(`${operation} failed: ${error.message || 'Unknown error'}`);
  }

  // =============================================
  // CONFIGURATION MANAGEMENT
  // =============================================

  /**
   * Get application configuration data
   */
  async getAppConfig(): Promise<any> {
    return this.retryOperation(async () => {
      // Production schema uses id=1 as per supabase-schema.sql
      const { data, error } = await supabase
        .from('app_config')
        .select('*')
        .eq('id', 1)
        .single();

      if (error) {
        console.warn('Error fetching app config:', error);
        return this.getDefaultConfig();
      }

      // If we have data but example_prompts is empty, merge with defaults
      if (data) {
        return {
          ...data,
          // If example_prompts is empty array, use our defaults
          example_prompts: data.example_prompts && data.example_prompts.length > 0 
            ? data.example_prompts 
            : this.getDefaultConfig().example_prompts
        };
      }

      return this.getDefaultConfig();
    });
  }

  /**
   * Get default configuration matching production schema
   */
  private getDefaultConfig() {
    return {
      id: 1,
      question_types: ['text', 'textarea', 'multiple-choice', 'rating', 'email', 'welcome'],
      example_prompts: [
        "A simple contact form",
        "Customer feedback survey for a coffee shop", 
        "Event registration for a tech meetup",
        "Product feedback questionnaire",
        "Employee satisfaction survey",
        "Wedding guest RSVP form"
      ],
      created_at: new Date().toISOString()
    };
  }



  /**
   * Update application configuration
   */
  async updateAppConfig(config: any): Promise<void> {
    return this.retryOperation(async () => {
      const { error } = await supabase
        .from('app_config')
        .upsert({
          ...config,
          updated_at: new Date().toISOString()
        });

      if (error) {
        this.handleError(error, 'Update app config');
      }
    });
  }

  // =============================================
  // FORM MANAGEMENT
  // =============================================

  /**
   * Get all forms for a specific user
   */
  async getForms(userId: string): Promise<FormSchema[]> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log('SupabaseService.getForms: userId:', userId);

    return this.retryOperation(async () => {
      const { data, error } = await supabase
        .from('forms')
        .select(`
          *,
          form_manifestos (
            product_vision,
            target_audience,
            business_goals,
            key_question_areas,
            conversation_tone
          )
        `)
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      console.log('SupabaseService.getForms: data:', data);
      console.log('SupabaseService.getForms: error:', error);

      if (error) {
        this.handleError(error, 'Get forms');
      }

      const transformedForms = (data || []).map(this.transformFormFromDB);
      console.log('SupabaseService.getForms: transformed forms:', transformedForms);
      return transformedForms;
    });
  }

  /**
   * Get a form by ID (public access for form sharing)
   */
  async getFormById(formId: string): Promise<FormSchema | null> {
    if (!formId) {
      throw new Error('Form ID is required');
    }

    return this.retryOperation(async () => {
      const { data, error } = await supabase
        .from('forms')
        .select(`
          *,
          form_manifestos (
            product_vision,
            target_audience,
            business_goals,
            key_question_areas,
            conversation_tone
          )
        `)
        .eq('id', formId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        this.handleError(error, 'Get form by ID');
      }

      return data ? this.transformFormFromDB(data) : null;
    });
  }

  /**
   * Create a new form
   */
  async createForm(
    form: Omit<FormSchema, 'views' | 'createdAt' | 'updatedAt' | 'ownerId'>, 
    ownerId: string
  ): Promise<FormSchema> {
    if (!form.id || !form.title || !ownerId) {
      throw new Error('Form ID, title, and owner ID are required');
    }

    return this.retryOperation(async () => {
      const { data, error } = await supabase
        .from('forms')
        .insert({
          id: form.id,
          title: form.title,
          description: form.description || '',
          questions: form.questions || [],
          settings: {
            intelligent_follow_ups: form.intelligentFollowUps || false,
            is_public: true
          },
          owner_id: ownerId,
          views: 0
        })
        .select()
        .single();

      if (error) {
        this.handleError(error, 'Create form');
      }
      
      if (form.manifesto && data) {
        try {
          await this.upsertFormManifesto(data.id, {
            productVision: form.manifestoData?.productVision || '',
            targetAudience: form.manifestoData?.targetAudience || '',
            businessGoals: form.manifestoData?.businessGoals || [],
            keyQuestionAreas: form.manifestoData?.keyQuestionAreas || [],
            conversationTone: form.manifestoData?.conversationTone || 'friendly',
          });
        } catch (manifestoError) {
          console.error(`Failed to save manifesto for form ${data.id}:`, manifestoError);
        }
      }

      const newForm = await this.getFormById(data.id);
      if (!newForm) {
        this.handleError(new Error('Failed to retrieve newly created form'), 'Create form');
      }
      return newForm!;
    });
  }

  /**
   * Update an existing form
   */
  async updateForm(formId: string, updates: Partial<FormSchema>): Promise<void> {
    if (!formId) {
      throw new Error('Form ID is required');
    }

    return this.retryOperation(async () => {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.questions !== undefined) updateData.questions = updates.questions;
      
      // Handle settings updates
      if (updates.intelligentFollowUps !== undefined) {
        // First get current settings, then update the specific field
        const { data: currentForm } = await supabase
          .from('forms')
          .select('settings')
          .eq('id', formId)
          .single();
        
        const currentSettings = currentForm?.settings || { is_public: true };
        updateData.settings = {
          ...currentSettings,
          intelligent_follow_ups: updates.intelligentFollowUps
        };
      }

      const { error } = await supabase
        .from('forms')
        .update(updateData)
        .eq('id', formId);

      if (error) {
        this.handleError(error, 'Update form');
      }

      // Handle manifesto updates (prefer structured data over text)
      if (updates.manifestoData) {
        try {
          await this.upsertFormManifesto(formId, {
            productVision: updates.manifestoData.productVision,
            targetAudience: updates.manifestoData.targetAudience,
            businessGoals: updates.manifestoData.businessGoals,
            keyQuestionAreas: updates.manifestoData.keyQuestionAreas || [],
            conversationTone: updates.manifestoData.conversationTone
          });
        } catch (manifestoError) {
          console.warn('Failed to update structured manifesto:', manifestoError);
          // Fallback to text manifesto if structured fails
          if (updates.manifesto) {
            try {
              await this.createManifestoFromText(formId, updates.manifesto);
            } catch (textManifestoError) {
              console.warn('Failed to update text manifesto:', textManifestoError);
            }
          }
        }
      } else if (updates.manifesto !== undefined) {
        try {
          if (updates.manifesto) {
            await this.createManifestoFromText(formId, updates.manifesto);
          } else {
            // Delete manifesto if set to empty
            await this.deleteFormManifesto(formId);
          }
        } catch (manifestoError) {
          console.warn('Failed to update manifesto:', manifestoError);
          // Don't fail the form update if manifesto update fails
        }
      }
    });
  }

  /**
   * Delete a form
   */
  async deleteForm(formId: string): Promise<void> {
    if (!formId) {
      throw new Error('Form ID is required');
    }

    return this.retryOperation(async () => {
      // First delete associated responses
      await this.deleteFormResponses(formId);
      
      // Then delete the form
      const { error } = await supabase
        .from('forms')
        .delete()
        .eq('id', formId);

      if (error) {
        this.handleError(error, 'Delete form');
      }
    });
  }

  /**
   * Delete all responses for a form
   */
  private async deleteFormResponses(formId: string): Promise<void> {
    const { error } = await supabase
      .from('form_responses')
      .delete()
      .eq('form_id', formId);

    if (error) {
      console.warn('Failed to delete form responses:', error);
      // Don't throw error - form deletion is more important
    }
  }

  /**
   * Increment form view count
   */
  async incrementFormViews(formId: string): Promise<void> {
    if (!formId) return;

    try {
      const { error } = await supabase.rpc('increment_form_views', {
        form_id: formId
      });

      if (error) {
        console.error('Error incrementing form views:', error);
        // Don't throw error for view counting - it's not critical
      }
    } catch (error) {
      console.error('Error incrementing form views:', error);
      // Don't throw error for view counting - it's not critical
    }
  }

  /**
   * Duplicate a form
   */
  async duplicateForm(formId: string, ownerId: string): Promise<FormSchema | null> {
    if (!formId || !ownerId) {
      throw new Error('Form ID and owner ID are required');
    }

    return this.retryOperation(async () => {
      const originalForm = await this.getFormById(formId);
      if (!originalForm) {
        throw new Error('Original form not found');
      }

      const duplicatedForm: Omit<FormSchema, 'views' | 'createdAt' | 'updatedAt' | 'ownerId'> = {
        id: `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: `${originalForm.title} (Copy)`,
        description: originalForm.description,
        manifesto: originalForm.manifesto,
        questions: originalForm.questions,
        intelligentFollowUps: originalForm.intelligentFollowUps
      };

      return this.createForm(duplicatedForm, ownerId);
    });
  }

  // =============================================
  // FORM RESPONSES
  // =============================================

  /**
   * Get all responses for a specific form
   */
  async getFormResponses(formId: string): Promise<FormResponse[]> {
    if (!formId) {
      throw new Error('Form ID is required');
    }

    console.log('SupabaseService.getFormResponses called for formId:', formId);

    // Log current session status
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('SupabaseService.getFormResponses: current session status:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      sessionError: sessionError?.message,
      userId: session?.user?.id
    });

    return this.retryOperation(async () => {
      const { data, error } = await supabase
        .from('form_responses')
        .select('*')
        .eq('form_id', formId)
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('SupabaseService.getFormResponses: database query failed:', error);
        console.error('SupabaseService.getFormResponses: error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });

        // Check if it's an RLS policy issue
        if (error.code === '42501' || error.message?.includes('policy')) {
          console.error('SupabaseService.getFormResponses: RLS policy blocking response access');
          throw new Error('Database security policy is blocking access to form responses. This might be an RLS configuration issue or the user might not be the form owner.');
        }

        this.handleError(error, 'Get form responses');
      }

      console.log('SupabaseService.getFormResponses: query successful, found responses:', data?.length || 0);
      
      return (data || []).map(this.transformResponseFromDB);
    });
  }

  /**
   * Submit a form response
   */
  async submitResponse(response: Omit<FormResponse, 'id' | 'submittedAt' | 'status'>): Promise<string> {
    console.log('SupabaseService.submitResponse called with:', {
      formId: response.formId,
      startedAt: response.startedAt,
      answersType: typeof response.answers,
      answersCount: Object.keys(response.answers || {}).length,
      hasAnswers: !!response.answers
    });

    // Log current session status
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('SupabaseService.submitResponse: current session status:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      sessionError: sessionError?.message,
      userId: session?.user?.id
    });

    if (!response.formId || !response.answers) {
      const error = new Error('Form ID and answers are required');
      console.error('SupabaseService.submitResponse validation failed:', error.message);
      throw error;
    }

    const responseId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log('SupabaseService.submitResponse: generated responseId:', responseId);

    return this.retryOperation(async () => {
      const insertData = {
        id: responseId,
        form_id: response.formId,
        respondent_id: response.respondentId || null,
        answers: response.answers,
        conversation_history: response.conversationHistory || null,
        status: 'completed' as const,
        started_at: response.startedAt,
        submitted_at: new Date().toISOString(),
        ip_address: response.ipAddress || null,
        user_agent: response.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown')
      };

      console.log('SupabaseService.submitResponse: attempting to insert data:', {
        ...insertData,
        answers: typeof insertData.answers === 'object' ? Object.keys(insertData.answers) : 'not an object'
      });

      // Test direct anonymous insert to bypass any potential session issues
      const { data, error } = await supabase
        .from('form_responses')
        .insert(insertData);

      if (error) {
        console.error('SupabaseService.submitResponse: database insert failed:', error);
        console.error('SupabaseService.submitResponse: error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });

        // Check if it's an RLS policy issue
        if (error.code === '42501' || error.message?.includes('policy')) {
          console.error('SupabaseService.submitResponse: RLS policy blocking anonymous submission');
          throw new Error('Database security policy is blocking anonymous form submissions. This might be an RLS configuration issue.');
        }

        this.handleError(error, 'Submit response');
      }

      console.log('SupabaseService.submitResponse: response inserted successfully, id:', responseId);
      return responseId;
    });
  }

  /**
   * Test anonymous response submission capability
   */
  async testAnonymousSubmission(): Promise<boolean> {
    try {
      console.log('Testing anonymous response submission...');
      
      const testResponse = {
        formId: 'test_form_anonymous_check',
        answers: { test: 'anonymous submission test' },
        startedAt: new Date().toISOString()
      };

      const { error } = await supabase
        .from('form_responses')
        .insert({
          form_id: testResponse.formId,
          answers: testResponse.answers,
          started_at: testResponse.startedAt,
          submitted_at: new Date().toISOString(),
          status: 'completed',
          user_agent: 'test'
        });

      if (error) {
        console.error('Anonymous submission test failed:', error);
        return false;
      }

      console.log('Anonymous submission test passed');
      return true;
    } catch (error) {
      console.error('Anonymous submission test error:', error);
      return false;
    }
  }

  /**
   * Delete a form response
   */
  async deleteResponse(responseId: string): Promise<void> {
    if (!responseId) {
      throw new Error('Response ID is required');
    }

    return this.retryOperation(async () => {
      const { error } = await supabase
        .from('form_responses')
        .delete()
        .eq('id', responseId);

      if (error) {
        this.handleError(error, 'Delete response');
      }
    });
  }

  // =============================================
  // ANALYTICS CACHE
  // =============================================

  /**
   * Get cached analysis data
   */
  async getAnalysisCache(cacheKey: string): Promise<any | null> {
    if (!cacheKey) return null;

    try {
      const { data, error } = await supabase
        .from('analytics_cache')
        .select('cache_data')
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found or expired
        }
        console.error('Error fetching analysis cache:', error);
        return null;
      }

      return data?.cache_data || null;
    } catch (error) {
      console.error('Error fetching analysis cache:', error);
      return null;
    }
  }

  /**
   * Set cached analysis data
   */
  async setAnalysisCache(cacheKey: string, data: any, ttlHours: number = 2): Promise<void> {
    if (!cacheKey || !data) return;

    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + ttlHours);

      const { error } = await supabase
        .from('analytics_cache')
        .upsert({
          cache_key: cacheKey,
          cache_data: data,
          expires_at: expiresAt.toISOString()
        }, {
          onConflict: 'cache_key'
        });

      if (error) {
        console.error('Error setting analysis cache:', error);
        // Don't throw error for caching - it's not critical
      }
    } catch (error) {
      console.error('Error setting analysis cache:', error);
      // Don't throw error for caching - it's not critical
    }
  }

  /**
   * Clear expired cache entries
   */
  async cleanupExpiredCache(): Promise<void> {
    try {
      const { error } = await supabase.rpc('cleanup_expired_cache');

      if (error) {
        console.error('Error cleaning up cache:', error);
      }
    } catch (error) {
      console.error('Error cleaning up cache:', error);
    }
  }

  // =============================================
  // USER MANAGEMENT
  // =============================================

  /**
   * Get user information from auth
   */
  async getUserInfo(userId: string): Promise<any | null> {
    if (!userId) return null;

    try {
      const { data: { user }, error } = await supabase.auth.admin.getUserById(userId);
      
      if (error) {
        console.error('Error fetching user info:', error);
        return null;
      }

      return user;
    } catch (error) {
      console.error('Error fetching user info:', error);
      return null;
    }
  }

  // =============================================
  // DATA TRANSFORMATION HELPERS
  // =============================================

  /**
   * Transform database form record to FormSchema
   */
  private transformFormFromDB(dbForm: any): FormSchema {
    const settings = dbForm.settings || {};
    const manifesto = dbForm.form_manifestos?.[0];
    
    // Construct manifesto string from form_manifestos data
    let manifestoText = '';
    let manifestoData = undefined;
    
    if (manifesto) {
      const parts = [];
      if (manifesto.product_vision) parts.push(`Vision: ${manifesto.product_vision}`);
      if (manifesto.target_audience) parts.push(`Audience: ${manifesto.target_audience}`);
      if (manifesto.business_goals?.length) parts.push(`Goals: ${manifesto.business_goals.join(', ')}`);
      manifestoText = parts.join('\n');
      
      // Create structured manifesto data for editing
      manifestoData = {
        productVision: manifesto.product_vision || '',
        targetAudience: manifesto.target_audience || '',
        businessGoals: manifesto.business_goals || [],
        keyQuestionAreas: manifesto.key_question_areas || [], // Retrieve key_question_areas
        conversationTone: manifesto.conversation_tone || 'friendly'
      };
    }

    return {
      id: dbForm.id,
      title: dbForm.title || '',
      description: dbForm.description || '',
      manifesto: manifestoText || undefined,
      manifestoData: manifestoData,
      questions: dbForm.questions || [],
      views: dbForm.views || 0,
      intelligentFollowUps: settings.intelligent_follow_ups || false,
      ownerId: dbForm.owner_id,
      createdAt: dbForm.created_at,
      updatedAt: dbForm.updated_at
    };
  }

  /**
   * Transform database response record to FormResponse
   */
  private transformResponseFromDB(dbResponse: any): FormResponse {
    return {
      id: dbResponse.id,
      formId: dbResponse.form_id,
      respondentId: dbResponse.respondent_id,
      answers: dbResponse.answers || {},
      startedAt: dbResponse.started_at,
      submittedAt: dbResponse.submitted_at,
      conversationHistory: dbResponse.conversation_history,
      status: dbResponse.status || 'in-progress',
      ipAddress: dbResponse.ip_address,
      userAgent: dbResponse.user_agent
    };
  }

  // =============================================
  // REAL-TIME SUBSCRIPTIONS
  // =============================================

  /**
   * Subscribe to form changes for real-time updates
   */
  subscribeToFormChanges(userId: string, callback: (payload: any) => void) {
    if (!userId) return null;

    return supabase
      .channel('form-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'forms',
          filter: `owner_id=eq.${userId}`
        },
        callback
      )
      .subscribe();
  }

  /**
   * Subscribe to response changes for real-time updates
   */
  subscribeToResponseChanges(formId: string, callback: (payload: any) => void) {
    if (!formId) return null;

    return supabase
      .channel('response-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'form_responses',
          filter: `form_id=eq.${formId}`
        },
        callback
      )
      .subscribe();
  }

  /**
   * Comprehensive database diagnostics
   */
  async runDatabaseDiagnostics(): Promise<void> {
    console.log('🔍 Running database diagnostics...');
    
    try {
      // Get current session for use in tests
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // Test 1: Check if form_responses table exists
      console.log('📋 Test 1: Checking if form_responses table exists...');
      const { data: tableCheck, error: tableError } = await supabase
        .from('form_responses')
        .select('count')
        .limit(1);
      
      if (tableError) {
        console.error('❌ form_responses table not found or accessible:', tableError);
        if (tableError.code === '42P01') {
          console.error('💡 The database schema has not been applied. Please run the SQL from supabase-schema.sql in your Supabase SQL editor.');
          return;
        }
      } else {
        console.log('✅ form_responses table exists and is accessible');
      }

      // Test 2: Check if forms table exists and has data
      console.log('📋 Test 2: Checking forms table...');
      const { data: formsData, error: formsError } = await supabase
        .from('forms')
        .select('id, title')
        .limit(3);
      
      if (formsError) {
        console.error('❌ forms table error:', formsError);
      } else {
        console.log('✅ forms table accessible. Found', formsData?.length || 0, 'forms');
      }

      // Test 3: Test anonymous access specifically
      console.log('📋 Test 3: Testing anonymous response insertion...');
      
      // First, get an existing form ID to use for testing
      let testFormId = 'diagnostic_test';
      if (formsData && formsData.length > 0) {
        testFormId = formsData[0].id;
        console.log('💡 Using existing form for test:', testFormId);
      } else {
        console.log('💡 No existing forms found, creating temporary test form...');
        // Create a temporary form for testing
        const { data: tempForm, error: tempFormError } = await supabase
          .from('forms')
          .insert({
            id: 'temp_diagnostic_form',
            title: 'Temporary Diagnostic Form',
            description: 'This is a temporary form for testing database connectivity',
            questions: [{ id: 'q1', type: 'text', label: 'Test Question' }],
            owner_id: session?.user?.id || null
          })
          .select()
          .single();
          
        if (tempFormError) {
          console.log('⚠️ Could not create temporary form, using null form_id for test');
          testFormId = 'temp_diagnostic_form';
        } else {
          testFormId = tempForm.id;
          console.log('✅ Created temporary form for testing:', testFormId);
        }
      }
      
      const testResponseId = crypto.randomUUID ? crypto.randomUUID() : `diag-${Date.now()}`;
      const { data: insertData, error: insertError } = await supabase
        .from('form_responses')
        .insert({
          id: testResponseId,
          form_id: testFormId,
          answers: { diagnostic: true, timestamp: new Date().toISOString() },
          started_at: new Date().toISOString(),
          submitted_at: new Date().toISOString(),
          status: 'completed',
          user_agent: 'diagnostic_test'
        })
        .select();

      if (insertError) {
        console.error('❌ Anonymous insertion failed:', insertError);
        
        if (insertError.code === '42501') {
          console.error('💡 RLS policy is blocking the insertion. The database policies may not be properly configured.');
        } else if (insertError.code === '23503') {
          console.error('💡 Foreign key constraint failed. The referenced form may not exist.');
        } else {
          console.error('💡 Unexpected error during insertion. Check database configuration.');
        }
      } else {
        console.log('✅ Anonymous insertion successful:', insertData);
        
        // Clean up test data
        await supabase
          .from('form_responses')
          .delete()
          .eq('id', testResponseId);
        console.log('🧹 Cleaned up test response data');
        
        // Clean up temporary form if we created one
        if (testFormId === 'temp_diagnostic_form') {
          await supabase
            .from('forms')
            .delete()
            .eq('id', 'temp_diagnostic_form');
          console.log('🧹 Cleaned up temporary diagnostic form');
        }
      }

      // Test 4: Check current user session
      console.log('📋 Test 4: Checking authentication state...');
      console.log('User session:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
        error: sessionError?.message
      });

    } catch (error) {
      console.error('❌ Database diagnostics failed:', error);
    }
    
    console.log('🏁 Database diagnostics completed');
  }

  // =============================================
  // FORM MANIFESTOS
  // =============================================

  /**
   * Get form manifesto by form ID
   */
  async getFormManifesto(formId: string): Promise<FormManifesto | null> {
    if (!formId) {
      throw new Error('Form ID is required');
    }

    return this.retryOperation(async () => {
      const { data, error } = await supabase
        .from('form_manifestos')
        .select('*')
        .eq('form_id', formId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        this.handleError(error, 'Get form manifesto');
      }

      return data ? this.transformManifestoFromDB(data) : null;
    });
  }

  /**
   * Create or update form manifesto
   */
  async upsertFormManifesto(formId: string, manifesto: Omit<FormManifesto, 'id' | 'formId' | 'createdAt' | 'updatedAt'>): Promise<FormManifesto> {
    if (!formId) {
      throw new Error('Form ID is required');
    }

    return this.retryOperation(async () => {
      // First try with the new schema (including success_metrics)
      const { data, error } = await supabase
        .from('form_manifestos')
        .upsert({
          form_id: formId,
          product_vision: manifesto.productVision,
          target_audience: manifesto.targetAudience,
          business_goals: manifesto.businessGoals,
          key_question_areas: manifesto.keyQuestionAreas,
          conversation_tone: manifesto.conversationTone,
          success_metrics: manifesto.successMetrics || [],
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'form_id'
        })
        .select()
        .single();

      if (error) {
        // Check if it's a column doesn't exist error (old schema)
        if (error.message?.includes('column') && error.message?.includes('success_metrics')) {
          console.warn('Database schema appears to be outdated. Trying without success_metrics column.');
          
          // Retry without the success_metrics column for backwards compatibility
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('form_manifestos')
            .upsert({
              form_id: formId,
              product_vision: manifesto.productVision,
              target_audience: manifesto.targetAudience,
              business_goals: manifesto.businessGoals,
              key_question_areas: manifesto.keyQuestionAreas,
              conversation_tone: manifesto.conversationTone,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'form_id'
            })
            .select()
            .single();
          
          if (fallbackError) {
            this.handleError(fallbackError, 'Upsert form manifesto (fallback)');
          }
          
          return this.transformManifestoFromDB(fallbackData);
        } else {
          this.handleError(error, 'Upsert form manifesto');
        }
      }

      return this.transformManifestoFromDB(data);
    });
  }

  /**
   * Delete form manifesto
   */
  async deleteFormManifesto(formId: string): Promise<void> {
    if (!formId) {
      throw new Error('Form ID is required');
    }

    return this.retryOperation(async () => {
      const { error } = await supabase
        .from('form_manifestos')
        .delete()
        .eq('form_id', formId);

      if (error) {
        this.handleError(error, 'Delete form manifesto');
      }
    });
  }

  /**
   * Create manifesto from text (helper method for backward compatibility)
   */
  private async createManifestoFromText(formId: string, manifestoText: string): Promise<void> {
    // Simple parsing - extract vision if present
    const lines = manifestoText.split('\n').filter(line => line.trim());
    let productVision = '';
    let targetAudience = '';
    let businessGoals: string[] = [];

    for (const line of lines) {
      if (line.toLowerCase().startsWith('vision:')) {
        productVision = line.substring(7).trim();
      } else if (line.toLowerCase().startsWith('audience:')) {
        targetAudience = line.substring(9).trim();
      } else if (line.toLowerCase().startsWith('goals:')) {
        businessGoals = line.substring(6).split(',').map(goal => goal.trim());
      } else if (!productVision) {
        // If no explicit vision, use first line as vision
        productVision = line;
      }
    }

    const manifesto: Omit<FormManifesto, 'id' | 'formId' | 'createdAt' | 'updatedAt'> = {
      productVision: productVision || manifestoText.substring(0, 200), // Fallback to first 200 chars
      targetAudience,
      businessGoals,
      keyQuestionAreas: [],
      conversationTone: 'friendly',
      successMetrics: []
    };

    await this.upsertFormManifesto(formId, manifesto);
  }

  /**
   * Transform database manifesto record to FormManifesto
   */
  private transformManifestoFromDB(dbManifesto: any): FormManifesto {
    return {
      id: dbManifesto.id,
      formId: dbManifesto.form_id,
      productVision: dbManifesto.product_vision,
      targetAudience: dbManifesto.target_audience,
      businessGoals: dbManifesto.business_goals || [],
      keyQuestionAreas: dbManifesto.key_question_areas || [],
      conversationTone: dbManifesto.conversation_tone || 'friendly',
      successMetrics: dbManifesto.success_metrics || [], // Handle missing column gracefully
      createdAt: dbManifesto.created_at,
      updatedAt: dbManifesto.updated_at
    };
  }
}

// Export singleton instance
export const supabaseService = new SupabaseService(); 