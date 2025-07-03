import { supabaseService } from './supabaseService';
import { useAuthStore } from '../store/authStore';
import { FormSchema, FormResponse } from '../types';

interface LocalStorageData {
  forms: FormSchema[];
  responses: Record<string, FormResponse[]>;
  users: any[];
  currentUser: any;
}

interface MigrationResult {
  success: boolean;
  formsCount: number;
  responsesCount: number;
  errors: string[];
}

export class DataMigration {
  /**
   * Main migration function
   */
  async migrateFromLocalStorage(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      formsCount: 0,
      responsesCount: 0,
      errors: []
    };

    try {
      console.log('Starting data migration from localStorage to Supabase...');

      // Check authentication
      const { isAuthenticated, getUserId } = useAuthStore.getState();
      if (!isAuthenticated() || !getUserId()) {
        result.errors.push('User must be authenticated to migrate data');
        return result;
      }

      const userId = getUserId()!;
      const data = this.extractLocalStorageData();
      
      if (!data) {
        console.log('No data found in localStorage to migrate');
        result.success = true;
        return result;
      }

      // Migrate forms
      for (const form of data.forms) {
        try {
          const existingForm = await supabaseService.getFormById(form.id);
          if (existingForm) continue;

          await supabaseService.createForm({
            id: form.id,
            title: form.title,
            description: form.description,
            manifesto: form.manifesto,
            questions: form.questions,
            intelligentFollowUps: form.intelligentFollowUps
          }, userId);

          result.formsCount++;
        } catch (error: any) {
          result.errors.push(`Failed to migrate form "${form.title}": ${error.message}`);
        }
      }

      // Migrate responses
      for (const [formId, responses] of Object.entries(data.responses)) {
        if (!responses) continue;
        
        for (const response of responses) {
          try {
            await supabaseService.submitResponse({
              formId: response.formId,
              answers: response.answers,
              startedAt: response.startedAt
            });
            result.responsesCount++;
          } catch (error: any) {
            result.errors.push(`Failed to migrate response: ${error.message}`);
          }
        }
      }

      result.success = result.errors.length === 0;
      return result;
    } catch (error: any) {
      result.errors.push(`Migration failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Extract data from localStorage
   */
  private extractLocalStorageData(): LocalStorageData | null {
    try {
      // Extract Zustand persisted data
      const formsStorageKey = 'dynamic-forms-storage';
      const usersStorageKey = 'mock-auth-users';
      const currentUserKey = 'mock-current-user';

      const formsData = localStorage.getItem(formsStorageKey);
      const usersData = localStorage.getItem(usersStorageKey);
      const currentUserData = localStorage.getItem(currentUserKey);

      if (!formsData) {
        return null;
      }

      const parsedFormsData = JSON.parse(formsData);
      const users = usersData ? JSON.parse(usersData) : [];
      const currentUser = currentUserData ? JSON.parse(currentUserData) : null;

      return {
        forms: parsedFormsData.state?.forms || [],
        responses: parsedFormsData.state?.responses || {},
        users,
        currentUser
      };
    } catch (error) {
      console.error('Error extracting localStorage data:', error);
      return null;
    }
  }

  /**
   * Clear localStorage data after successful migration
   */
  clearLocalStorageData(): void {
    try {
      const keysToRemove = [
        'dynamic-forms-storage',
        'mock-auth-users',
        'mock-current-user'
      ];

      // Also remove analysis cache keys
      const allKeys = Object.keys(localStorage);
      const cacheKeys = allKeys.filter(key =>
        key.includes('_analysis_') ||
        key.includes('bulk_analysis_') ||
        key.includes('shared_form_')
      );

      const totalKeys = [...keysToRemove, ...cacheKeys];
      
      totalKeys.forEach(key => {
        localStorage.removeItem(key);
      });

      console.log(`🧹 Cleared ${totalKeys.length} localStorage keys`);
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }

  /**
   * Get migration status
   */
  getMigrationStatus(): {
    hasLocalStorageData: boolean;
    estimatedForms: number;
    estimatedResponses: number;
  } {
    const data = this.extractLocalStorageData();
    
    if (!data) {
      return {
        hasLocalStorageData: false,
        estimatedForms: 0,
        estimatedResponses: 0
      };
    }

    const totalResponses = Object.values(data.responses).reduce(
      (total, responses) => total + (responses?.length || 0), 
      0
    );

    return {
      hasLocalStorageData: true,
      estimatedForms: data.forms.length,
      estimatedResponses: totalResponses
    };
  }

  /**
   * Export localStorage data as JSON for backup
   */
  exportLocalStorageData(): string | null {
    const data = this.extractLocalStorageData();
    if (!data) return null;

    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      version: '1.0',
      data
    }, null, 2);
  }
}

// Export singleton instance
export const dataMigration = new DataMigration(); 