import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { useState, useEffect } from 'react';
import { FormSchema } from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// localStorage-based cache for form analysis (replacing cookie-based cache)
export const AnalysisCache = {
  getCacheKey: (formId: string, questionsHash: string) => `form_analysis_${formId}_${questionsHash}`,
  
  getQuestionsHash: (questions: any[]) => {
    // Create a simple hash of the questions structure
    const questionsString = JSON.stringify(questions.map(q => ({
      id: q.id,
      type: q.type,
      label: q.label,
      options: q.options,
      required: q.required,
      logic: q.logic
    })));
    return btoa(questionsString).slice(0, 16); // Short hash
  },
  
  set: (formId: string, questionsHash: string, analysis: any, ttlHours: number = 24) => {
    try {
      const cacheData = {
        analysis,
        timestamp: Date.now(),
        ttl: ttlHours * 60 * 60 * 1000 // Convert hours to milliseconds
      };
      const cacheKey = AnalysisCache.getCacheKey(formId, questionsHash);
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      return true;
    } catch (error) {
      return false;
    }
  },
  
  get: (formId: string, questionsHash: string) => {
    try {
      const cacheKey = AnalysisCache.getCacheKey(formId, questionsHash);
      const cacheValue = localStorage.getItem(cacheKey);
      
      if (!cacheValue) return null;
      
      const cacheData = JSON.parse(cacheValue);
      
      // Check if cache is still valid
      const now = Date.now();
      if (now - cacheData.timestamp > cacheData.ttl) {
        AnalysisCache.clear(formId, questionsHash);
        return null;
      }
      
      return cacheData.analysis;
    } catch (error) {
      return null;
    }
  },
  
  clear: (formId: string, questionsHash: string) => {
    try {
      const cacheKey = AnalysisCache.getCacheKey(formId, questionsHash);
      localStorage.removeItem(cacheKey);
    } catch (error) {
      // Silent fail for cache cleanup
    }
  },
  
  clearAll: (formId: string) => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`form_analysis_${formId}_`)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      // Silent fail for cache cleanup
    }
  }
};

// Response Analysis Cache (localStorage-based)
export const ResponseAnalysisCache = {
  getCacheKey: (formId: string, responseId: string) => `response_analysis_${formId}_${responseId}`,
  
  getResponseHash: (response: any) => {
    // Create a hash of the response content
    const responseString = JSON.stringify({
      responseId: response.responseId,
      answers: response.answers,
      submittedAt: response.submittedAt
    });
    return btoa(responseString).slice(0, 16); // Short hash
  },
  
  set: (formId: string, responseId: string, analysis: any, ttlHours: number = 6) => {
    try {
      const cacheData = {
        analysis,
        timestamp: Date.now(),
        ttl: ttlHours * 60 * 60 * 1000
      };
      const cacheKey = ResponseAnalysisCache.getCacheKey(formId, responseId);
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      return true;
    } catch (error) {
      return false;
    }
  },
  
  get: (formId: string, responseId: string) => {
    try {
      const cacheKey = ResponseAnalysisCache.getCacheKey(formId, responseId);
      const cacheValue = localStorage.getItem(cacheKey);
      
      if (!cacheValue) return null;
      
      const cacheData = JSON.parse(cacheValue);
      
      // Check if cache is still valid
      const now = Date.now();
      if (now - cacheData.timestamp > cacheData.ttl) {
        ResponseAnalysisCache.clear(formId, responseId);
        return null;
      }
      
      return cacheData.analysis;
    } catch (error) {
      return null;
    }
  },
  
  clear: (formId: string, responseId: string) => {
    try {
      const cacheKey = ResponseAnalysisCache.getCacheKey(formId, responseId);
      localStorage.removeItem(cacheKey);
    } catch (error) {
      // Silent fail for cache cleanup
    }
  },
  
  clearAll: (formId: string) => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`response_analysis_${formId}_`)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      // Silent fail for cache cleanup
    }
  }
};

// Overall Response Analysis Cache (localStorage-based)
export const BulkResponseAnalysisCache = {
  getCacheKey: (formId: string, responsesHash: string) => `bulk_analysis_${formId}_${responsesHash}`,
  
  getResponsesHash: (responses: any[]) => {
    // Create a hash based on response IDs and count
    const hashData = {
      count: responses.length,
      ids: responses.map(r => r.responseId).sort().slice(0, 10), // First 10 IDs for uniqueness
      lastSubmitted: responses.length > 0 ? Math.max(...responses.map(r => new Date(r.submittedAt).getTime())) : 0
    };
    return btoa(JSON.stringify(hashData)).slice(0, 16);
  },
  
  set: (formId: string, responsesHash: string, analysis: any, ttlHours: number = 2) => {
    try {
      const cacheData = {
        analysis,
        timestamp: Date.now(),
        ttl: ttlHours * 60 * 60 * 1000
      };
      const cacheKey = BulkResponseAnalysisCache.getCacheKey(formId, responsesHash);
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      return true;
    } catch (error) {
      return false;
    }
  },
  
  get: (formId: string, responsesHash: string) => {
    try {
      const cacheKey = BulkResponseAnalysisCache.getCacheKey(formId, responsesHash);
      const cacheValue = localStorage.getItem(cacheKey);
      
      if (!cacheValue) return null;
      
      const cacheData = JSON.parse(cacheValue);
      
      // Check if cache is still valid
      const now = Date.now();
      if (now - cacheData.timestamp > cacheData.ttl) {
        BulkResponseAnalysisCache.clear(formId, responsesHash);
        return null;
      }
      
      return cacheData.analysis;
    } catch (error) {
      return null;
    }
  },
  
  clear: (formId: string, responsesHash: string) => {
    try {
      const cacheKey = BulkResponseAnalysisCache.getCacheKey(formId, responsesHash);
      localStorage.removeItem(cacheKey);
    } catch (error) {
      // Silent fail for cache cleanup
    }
  }
};

// Cleanup function to clear all old cookie-based cache data
export const clearLegacyCookieCache = () => {
  try {
    const cookies = document.cookie.split(';');
    const cachePatterns = [
      'form_analysis_',
      'response_analysis_', 
      'bulk_analysis_'
    ];
    
    let cleared = 0;
    cookies.forEach(cookie => {
      const cookieName = cookie.trim().split('=')[0];
      if (cachePatterns.some(pattern => cookieName.startsWith(pattern))) {
        // Clear the problematic cookie
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
        cleared++;
      }
    });
    

    
    return cleared;
  } catch (error) {
    return 0;
  }
};

// Enhanced cleanup that also removes large localStorage items if needed
export const clearAllCache = () => {
  const clearedCookies = clearLegacyCookieCache();
  
  // Optionally clear localStorage cache if it gets too large (>2MB)
  try {
    let totalSize = 0;
    const keys = Object.keys(localStorage);
    
    keys.forEach(key => {
      if (key.includes('_analysis_')) {
        totalSize += localStorage.getItem(key)?.length || 0;
      }
    });
    
    // If total cache size > 2MB, clear older entries
    if (totalSize > 2 * 1024 * 1024) {
      const cacheKeys = keys.filter(key => 
        key.includes('_analysis_') && localStorage.getItem(key)
      );
      
      // Sort by timestamp and remove oldest 50%
      cacheKeys.sort((a, b) => {
        try {
          const aData = JSON.parse(localStorage.getItem(a) || '{}');
          const bData = JSON.parse(localStorage.getItem(b) || '{}');
          return aData.timestamp - bData.timestamp;
        } catch {
          return 0;
        }
      });
      
      const toRemove = cacheKeys.slice(0, Math.floor(cacheKeys.length / 2));
      toRemove.forEach(key => localStorage.removeItem(key));
    }
  } catch (error) {
    // Silent fail for cache optimization
  }
};

// Auto-cleanup on module load to prevent 431 errors
if (typeof document !== 'undefined') {
  clearLegacyCookieCache();
}

/**
 * Generates a secure random ID for forms
 * Format: form_[12 character secure random string]
 */
export function generateFormId(): string {
  // Use crypto.getRandomValues for better randomness if available
  const getRandomBytes = (length: number) => {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint8Array(length);
      crypto.getRandomValues(array);
      return Array.from(array);
    } else {
      // Fallback for environments without crypto API
      return Array.from({ length }, () => Math.floor(Math.random() * 256));
    }
  };

  // Base62 alphabet (alphanumeric, URL-safe)
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  
  // Generate high-entropy ID using timestamp + random data
  const timestamp = Date.now();
  const randomBytes = getRandomBytes(16); // More random bytes for better uniqueness
  
  // Create a unique seed by combining timestamp with random data
  let seed = timestamp;
  for (let i = 0; i < randomBytes.length; i++) {
    seed = (seed * 256 + randomBytes[i]) % Number.MAX_SAFE_INTEGER;
  }
  
  // Convert to base62 with guaranteed minimum length
  let result = '';
  let num = seed;
  
  // Generate at least 12 characters for better uniqueness
  while (result.length < 12 || num > 0) {
    result = alphabet[num % 62] + result;
    num = Math.floor(num / 62);
  }
  
  // Add additional random suffix for extra uniqueness
  const suffix = getRandomBytes(4).map(byte => alphabet[byte % 62]).join('');
  result += suffix;
  
  return `form_${result}`;
}

/**
 * Generates an extremely secure form ID with maximum entropy
 * Used when regular ID generation fails due to conflicts
 */
export function generateSecureFormId(): string {
  const getRandomBytes = (length: number) => {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint8Array(length);
      crypto.getRandomValues(array);
      return Array.from(array);
    } else {
      return Array.from({ length }, () => Math.floor(Math.random() * 256));
    }
  };

  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  
  // Use multiple entropy sources
  const timestamp = Date.now();
  const performanceNow = typeof performance !== 'undefined' ? performance.now() : Math.random() * 1000000;
  const randomBytes = getRandomBytes(24); // Even more random bytes
  
  // Create multiple seeds for better distribution
  let seed1 = timestamp;
  let seed2 = Math.floor(performanceNow * 1000);
  
  // Mix in random bytes
  for (let i = 0; i < randomBytes.length; i++) {
    if (i % 2 === 0) {
      seed1 = (seed1 * 256 + randomBytes[i]) % Number.MAX_SAFE_INTEGER;
    } else {
      seed2 = (seed2 * 256 + randomBytes[i]) % Number.MAX_SAFE_INTEGER;
    }
  }
  
  // Generate two parts and combine
  const generatePart = (seed: number, minLength: number) => {
    let result = '';
    let num = seed;
    while (result.length < minLength || num > 0) {
      result = alphabet[num % 62] + result;
      num = Math.floor(num / 62);
    }
    return result;
  };
  
  const part1 = generatePart(seed1, 8);
  const part2 = generatePart(seed2, 8);
  
  // Add final random suffix
  const suffix = getRandomBytes(6).map(byte => alphabet[byte % 62]).join('');
  
  return `form_${part1}${part2}${suffix}`;
}

/**
 * Generates a secure random ID for questions
 * Format: q_[8 character secure random string]
 */
export function generateQuestionId(): string {
  const getRandomBytes = () => {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint8Array(6);
      crypto.getRandomValues(array);
      return Array.from(array);
    } else {
      return Array.from({ length: 6 }, () => Math.floor(Math.random() * 256));
    }
  };

  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const randomBytes = getRandomBytes();
  
  let result = '';
  for (const byte of randomBytes) {
    result += alphabet[byte % 62];
  }
  
  return `q_${result}`;
}

/**
 * Validates if a string is a valid form ID
 */
export function isValidFormId(id: string): boolean {
  return /^form_[A-Za-z0-9]{8,}$/.test(id);
}

/**
 * Validates if a string is a valid question ID
 */
export function isValidQuestionId(id: string): boolean {
  return /^q_[A-Za-z0-9]{6,}$/.test(id);
}

/**
 * Encodes a form schema into a compressed string for URL sharing
 * Only includes essential data to keep URLs short
 */
export function encodeFormForSharing(form: FormSchema): string {
  try {
    // Create a very minimal version - only essential data
    const minimalForm = {
      i: form.id,
      t: form.title,
      d: form.description,
      q: form.questions.map(q => ({
        i: q.id,
        t: q.type,
        l: q.label,
        d: q.description,
        o: q.options,
        r: q.required,
        g: q.logic
      })),
      m: form.manifesto,
      f: form.intelligentFollowUps
    };
    
    const jsonString = JSON.stringify(minimalForm);
    
    // Check if the resulting URL would be too long
    const encoded = btoa(encodeURIComponent(jsonString));
    const baseUrl = window.location.origin + '/#/form/' + form.id + '?data=';
    if ((baseUrl + encoded).length > 1800) { // Conservative limit
      throw new Error('Form too large for URL sharing');
    }
    
    return encoded;
  } catch (error) {
    throw new Error('Form too large for URL sharing');
  }
}

/**
 * Decodes a form schema from a compressed string
 */
export function decodeFormFromSharing(encoded: string): FormSchema {
  try {
    const jsonString = decodeURIComponent(atob(encoded));
    const minimalForm = JSON.parse(jsonString);
    
    // Reconstruct full form from minimal data
    const now = new Date().toISOString();
    const fullForm: FormSchema = {
      id: minimalForm.i,
      title: minimalForm.t,
      description: minimalForm.d,
      questions: minimalForm.q?.map((q: any) => ({
        id: q.i,
        type: q.t,
        label: q.l,
        description: q.d,
        options: q.o,
        required: q.r,
        logic: q.g
      })) || [],
      manifesto: minimalForm.m,
      intelligentFollowUps: minimalForm.f,
      createdAt: now,
      updatedAt: now,
      views: 0,
      ownerId: 'shared'
    };
    
    return fullForm;
  } catch (error) {
    throw new Error('Failed to decode form from sharing');
  }
}

/**
 * Extracts form data from URL parameters
 */
export function getFormDataFromUrl(): FormSchema | null {
  try {
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const encodedData = urlParams.get('data');
    
    if (encodedData) {
      return decodeFormFromSharing(encodedData);
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Sharing cache for forms too large for URL encoding
 * Uses localStorage with expiration
 */
export const SharingCache = {
  getCacheKey: (formId: string) => `shared_form_${formId}`,
  
  set: (form: FormSchema, ttlHours: number = 48) => {
    try {
      const cacheData = {
        form,
        timestamp: Date.now(),
        ttl: ttlHours * 60 * 60 * 1000
      };
      const cacheKey = SharingCache.getCacheKey(form.id);
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      return true;
    } catch (error) {
      return false;
    }
  },
  
  get: (formId: string) => {
    try {
      const cacheKey = SharingCache.getCacheKey(formId);
      const cached = localStorage.getItem(cacheKey);
      
      if (!cached) return null;
      
      const cacheData = JSON.parse(cached);
      
      // Check if cache is still valid
      if (Date.now() - cacheData.timestamp > cacheData.ttl) {
        SharingCache.clear(formId);
        return null;
      }
      
      return cacheData.form;
    } catch (error) {
      return null;
    }
  },
  
  clear: (formId: string) => {
    try {
      const cacheKey = SharingCache.getCacheKey(formId);
      localStorage.removeItem(cacheKey);
    } catch (error) {
      // Silent fail for cache cleanup
    }
  }
};

/**
 * Generate a simple shareable URL for a form
 * Forms are loaded from the database, not embedded in the URL
 */
export function generateShareableFormUrl(form: FormSchema, baseUrl: string = window.location.origin): string {
  return `${baseUrl}/#/form/${form.id}`;
}

/**
 * Enhanced form lookup that checks multiple sources
 */
export function findSharedForm(formId: string): FormSchema | null {
  // Try URL parameters first
  try {
    const urlFormData = getFormDataFromUrl();
    if (urlFormData && urlFormData.id === formId) {
      return urlFormData;
    }
  } catch (error) {
    // Silent fail
  }

  // Try sharing cache
  try {
    const cachedForm = SharingCache.get(formId);
    if (cachedForm) {
      return cachedForm;
    }
  } catch (error) {
    // Silent fail
  }

  return null;
}

// Production-safe logging utilities (no-op in production)
export const devLog = (...args: any[]) => {
  // No logging in production
};

export const devWarn = (...args: any[]) => {
  // No logging in production
};

export const devError = (...args: any[]) => {
  // No logging in production
};

// Mobile detection hook
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return isMobile;
};
