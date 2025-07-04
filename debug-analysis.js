/**
 * Debug script for testing analysis system
 * 
 * To use:
 * 1. Open browser console
 * 2. Copy and paste this script
 * 3. Run the functions to test
 */

// Test the analysis endpoint directly
async function testAnalysisEndpoint() {
  const testForm = {
    id: 'test-form-123',
    title: 'Test Coffee Shop Survey',
    description: 'Testing the analysis system',
    questions: [
      {
        id: 'q1',
        type: 'text',
        label: 'What is your favorite coffee?',
        required: true
      },
      {
        id: 'q2',
        type: 'rating',
        label: 'How would you rate our service?',
        min: 1,
        max: 5,
        required: true
      }
    ],
    manifesto: 'We want to create the best coffee experience for our customers',
    manifestoData: {
      productVision: 'Premium coffee experience',
      targetAudience: 'Coffee enthusiasts',
      businessGoals: ['Improve customer satisfaction', 'Increase retention'],
      keyQuestionAreas: ['Product quality', 'Service quality'],
      conversationTone: 'friendly'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    views: 0
  };

  console.log('Testing form analysis endpoint...');
  
  try {
    const response = await fetch('/api/ai/analyze-form', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`
      },
      body: JSON.stringify({ formSchema: testForm })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Analysis result:', result);
    return result;
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    return null;
  }
}

// Test manifesto analysis with sample responses
async function testManifestoAnalysis() {
  const testForm = {
    id: 'test-form-123',
    title: 'Test Coffee Shop Survey',
    manifesto: 'We want to create the best coffee experience for our customers',
    manifestoData: {
      businessGoals: ['Improve customer satisfaction', 'Increase retention']
    }
  };

  const testResponses = [
    {
      id: 'resp1',
      formId: 'test-form-123',
      answers: {
        'q1': 'I love the espresso here!',
        'q2': 5
      },
      submittedAt: new Date().toISOString()
    },
    {
      id: 'resp2',
      formId: 'test-form-123',
      answers: {
        'q1': 'The latte is okay but could be better',
        'q2': 3
      },
      submittedAt: new Date().toISOString()
    }
  ];

  console.log('Testing manifesto analysis endpoint...');
  
  try {
    const response = await fetch('/api/ai/analyze-manifesto-responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`
      },
      body: JSON.stringify({ formSchema: testForm, responses: testResponses })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Manifesto analysis result:', result);
    return result;
  } catch (error) {
    console.error('❌ Manifesto analysis failed:', error);
    return null;
  }
}

// Debug function to check current state
function debugAnalysisState() {
  console.log('=== ANALYSIS DEBUG INFO ===');
  
  // Check cache
  const cacheStats = getCacheStats();
  console.log('Cache stats:', cacheStats);
  
  // Check forms
  const formStore = useFormStore.getState();
  console.log('Current forms:', formStore.forms);
  console.log('Current analyses:', formStore.analyses);
  
  // Check auth
  const authStore = useAuthStore.getState();
  console.log('Current user:', authStore.user?.email);
  
  // Check Supabase config
  console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
  console.log('API URL:', import.meta.env.VITE_API_URL);
}

// Make functions available globally
window.testAnalysisEndpoint = testAnalysisEndpoint;
window.testManifestoAnalysis = testManifestoAnalysis;
window.debugAnalysisState = debugAnalysisState;

console.log('🔧 Debug functions loaded:');
console.log('- testAnalysisEndpoint() - Test form analysis');
console.log('- testManifestoAnalysis() - Test manifesto analysis');
console.log('- debugAnalysisState() - Check current state');
console.log('- clearAnalysisCache() - Clear localStorage cache');
console.log('- listAnalysisCache() - List cache entries');
console.log('- getCacheStats() - Get cache statistics'); 