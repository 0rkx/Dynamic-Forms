import React, { useState, useEffect, useRef } from 'react';
import { FormSchema, FormResponse } from '../../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { Brain, TrendingUp, Users, MessageSquare, AlertCircle, CheckCircle, Lightbulb, Target, RefreshCw } from 'lucide-react';
import { analyzeFormResponses } from '../../lib/gemini';
import { BulkResponseAnalysisCache } from '../../lib/utils';
import { supabaseService } from '../../lib/supabaseService';

interface AnswerAnalysisTabProps {
  form: FormSchema;
  responses: FormResponse[];
}

interface AnalysisResult {
  overview: {
    totalResponses: number;
    mainThemes: string[];
    overallSentiment: 'positive' | 'neutral' | 'negative';
    confidenceScore: number;
  };
  keyInsights: {
    type: 'positive' | 'negative' | 'suggestion' | 'trend';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    actionable: boolean;
  }[];
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    action: string;
    reason: string;
    impact: string;
  }[];
}

const AnswerAnalysisTab: React.FC<AnswerAnalysisTabProps> = ({ form, responses }) => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const isAnalyzingRef = useRef(false);
  const currentResponsesHashRef = useRef<string>('');

  const analyzeResponses = async (forceRefresh = false) => {
    if (isAnalyzingRef.current || responses.length === 0) return;
    
            const responsesHash = JSON.stringify(responses.map(r => r.id).sort());
    
    if (!forceRefresh && currentResponsesHashRef.current === responsesHash && analysis) {
      return;
    }
    
    // Check database cache first
    if (!forceRefresh) {
      try {
        const cacheKey = `form_analysis_${form.id}_${responsesHash}`;
        const cachedAnalysis = await supabaseService.getAnalysisCache(cacheKey);
        if (cachedAnalysis) {
          console.log('Using database-cached analysis');
          setAnalysis(cachedAnalysis);
          setError(null);
          currentResponsesHashRef.current = responsesHash;
          return;
        }
      } catch (cacheError) {
        console.warn('Failed to check database cache:', cacheError);
      }
    }
    
    // Check localStorage cache
    if (!forceRefresh) {
      const cachedAnalysis = BulkResponseAnalysisCache.get(form.id, responsesHash);
      if (cachedAnalysis) {
        console.log('Using localStorage-cached analysis');
        setAnalysis(cachedAnalysis);
        setError(null);
        currentResponsesHashRef.current = responsesHash;
        return;
      }
    }
    
    setIsAnalyzing(true);
    setError(null);
    isAnalyzingRef.current = true;
    
    try {
      console.log('Starting AI analysis...');
      const aiAnalysis = await analyzeFormResponses(form, responses);
      
      // Store in database cache for 24 hours
      try {
        const cacheKey = `form_analysis_${form.id}_${responsesHash}`;
        await supabaseService.setAnalysisCache(cacheKey, aiAnalysis, 24);
        console.log('Analysis cached in database');
      } catch (dbCacheError) {
        console.warn('Failed to cache analysis in database:', dbCacheError);
      }
      
      // Store in localStorage cache as backup
      BulkResponseAnalysisCache.set(form.id, responsesHash, aiAnalysis, 2);
      
      setAnalysis(aiAnalysis);
      setError(null);
      setRetryCount(0);
      currentResponsesHashRef.current = responsesHash;
      
      console.log('Analysis completed and cached');
    } catch (error: any) {
      console.error('Failed to analyze responses:', error);
      setError(`Analysis failed: ${error.message || 'Unknown error'}. This might be due to AI service limitations or network issues.`);
      setAnalysis(null);
      setRetryCount(prev => prev + 1);
    }
    
    setIsAnalyzing(false);
    isAnalyzingRef.current = false;
  };

  const handleRetry = () => {
    analyzeResponses(true);
  };

  useEffect(() => {
    if (responses.length > 0) {
      analyzeResponses();
    }
  }, [responses]);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'positive': return <CheckCircle className="h-5 w-5 text-neutral-600" />;
      case 'negative': return <AlertCircle className="h-5 w-5 text-neutral-600" />;
      case 'suggestion': return <Lightbulb className="h-5 w-5 text-neutral-600" />;
      case 'trend': return <TrendingUp className="h-5 w-5 text-neutral-600" />;
      default: return <MessageSquare className="h-5 w-5 text-neutral-500" />;
    }
  };

  if (responses.length === 0) {
    return (
      <div className="text-center py-24 px-8">
        <div className="w-24 h-24 bg-neutral-100 rounded-lg mx-auto mb-8 flex items-center justify-center">
          <Brain className="h-12 w-12 text-neutral-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-neutral-900 mb-4">Ready to Analyze Responses</h2>
        <p className="text-neutral-600 mb-8 max-w-2xl mx-auto">
          Once responses start coming in, I'll use AI to discover insights, trends, and actionable recommendations from your form data.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          <div className="border border-neutral-200 rounded-lg p-6">
            <div className="w-12 h-12 bg-neutral-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-neutral-600" />
            </div>
            <h3 className="font-semibold text-neutral-900 mb-2">Sentiment Analysis</h3>
            <p className="text-sm text-neutral-600">Understand the emotional tone of responses</p>
          </div>
          
          <div className="border border-neutral-200 rounded-lg p-6">
            <div className="w-12 h-12 bg-neutral-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <Target className="h-6 w-6 text-neutral-600" />
            </div>
            <h3 className="font-semibold text-neutral-900 mb-2">Key Insights</h3>
            <p className="text-sm text-neutral-600">Discover patterns and important themes</p>
          </div>
          
          <div className="border border-neutral-200 rounded-lg p-6">
            <div className="w-12 h-12 bg-neutral-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <Lightbulb className="h-6 w-6 text-neutral-600" />
            </div>
            <h3 className="font-semibold text-neutral-900 mb-2">Recommendations</h3>
            <p className="text-sm text-neutral-600">Get actionable suggestions for improvement</p>
          </div>
        </div>
        
        <div className="mt-12">
          <div className="inline-flex items-center px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg text-sm">
            <MessageSquare className="h-4 w-4 mr-2" />
            Waiting for first response...
          </div>
        </div>
      </div>
    );
  }

  if (error && !analysis) {
    return (
      <div className="text-center py-24 px-8">
        <div className="w-24 h-24 bg-red-50 rounded-lg mx-auto mb-8 flex items-center justify-center">
          <AlertCircle className="h-12 w-12 text-red-500" />
        </div>
        
        <h2 className="text-2xl font-bold text-neutral-900 mb-4">Analysis Failed</h2>
        <p className="text-neutral-600 mb-8 max-w-2xl mx-auto">
          {error}
        </p>
        
        <div className="space-y-4">
          <Button onClick={handleRetry} disabled={isAnalyzing} className="mx-auto">
            <RefreshCw className={`h-4 w-4 mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
            {isAnalyzing ? 'Retrying...' : `Retry Analysis ${retryCount > 0 ? `(Attempt ${retryCount + 1})` : ''}`}
          </Button>
          
          {retryCount > 2 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-sm text-yellow-800">
                <strong>Persistent Issues?</strong><br/>
                The AI analysis service may be temporarily unavailable. 
                Your response data is safely stored and you can try again later.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <div className="text-center py-24 px-8">
        <div className="w-24 h-24 mx-auto mb-8 relative">
          <div className="absolute inset-0 border-4 border-neutral-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-neutral-900 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Brain className="h-8 w-8 text-neutral-600" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-neutral-900 mb-4">AI Analysis in Progress</h2>
        <p className="text-neutral-600 mb-8 max-w-2xl mx-auto">
          Analyzing {responses.length} responses to discover insights, patterns, and actionable recommendations...
        </p>
        
        <div className="max-w-md mx-auto">
          <div className="space-y-4">
            <div className="flex items-center text-sm">
              <div className="w-2 h-2 bg-neutral-400 rounded-full mr-3"></div>
              <span className="text-neutral-700">Processing responses...</span>
            </div>
            <div className="flex items-center text-sm">
              <div className="w-2 h-2 bg-neutral-400 rounded-full mr-3"></div>
              <span className="text-neutral-700">Extracting key themes...</span>
            </div>
            <div className="flex items-center text-sm">
              <div className="w-2 h-2 bg-neutral-400 rounded-full mr-3"></div>
              <span className="text-neutral-700">Generating insights...</span>
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-xs text-neutral-500">
          This usually takes 10-30 seconds
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="space-y-8">
      {/* Show retry button if there was an error but we have cached analysis */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                Showing cached analysis. Latest analysis failed: {error}
              </span>
            </div>
            <Button size="sm" variant="outline" onClick={handleRetry} disabled={isAnalyzing}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isAnalyzing ? 'animate-spin' : ''}`} />
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Analysis refresh button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">AI Analysis Results</h2>
        <Button variant="outline" onClick={() => analyzeResponses(true)} disabled={isAnalyzing} size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
          {isAnalyzing ? 'Analyzing...' : 'Refresh Analysis'}
        </Button>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="border border-neutral-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-neutral-600" />
            </div>
            <h3 className="font-semibold text-neutral-900">Total Voices</h3>
          </div>
          <p className="text-3xl font-bold text-neutral-900">{analysis?.overview?.totalResponses || 0}</p>
          <p className="text-sm text-neutral-600">people shared feedback</p>
        </div>

        <div className="border border-neutral-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-neutral-600" />
            </div>
            <h3 className="font-semibold text-neutral-900">Overall Sentiment</h3>
          </div>
          <p className="text-3xl font-bold mb-1 text-neutral-900">
            {analysis?.overview?.overallSentiment === 'positive' ? '😊' :
             analysis?.overview?.overallSentiment === 'negative' ? '😟' : '😐'}
          </p>
          <p className="text-sm capitalize text-neutral-600">{analysis?.overview?.overallSentiment || 'neutral'} feedback</p>
        </div>

        <div className="border border-neutral-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
              <Brain className="h-5 w-5 text-neutral-600" />
            </div>
            <h3 className="font-semibold text-neutral-900">AI Confidence</h3>
          </div>
          <p className="text-3xl font-bold text-neutral-900">{analysis?.overview?.confidenceScore || 0}%</p>
          <p className="text-sm text-neutral-600">analysis accuracy</p>
        </div>

        <div className="border border-neutral-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
              <Target className="h-5 w-5 text-neutral-600" />
            </div>
            <h3 className="font-semibold text-neutral-900">Main Themes</h3>
          </div>
          <div className="space-y-2">
            {(analysis?.overview?.mainThemes || []).slice(0, 3).map((theme, index) => (
              <div key={index} className="text-xs px-3 py-2 bg-neutral-100 text-neutral-700 rounded-lg">
                {theme}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div>
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">What Your Customers Are Really Saying</h2>
          <p className="text-neutral-600">AI-powered insights from your responses</p>
        </div>
        <div className="grid gap-6">
          {(analysis?.keyInsights || []).map((insight, index) => (
            <div key={index} className="border border-neutral-200 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-neutral-100 rounded-lg flex items-center justify-center">
                    {getInsightIcon(insight.type)}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-neutral-900 mb-2">{insight.title}</h3>
                  <p className="text-neutral-600 mb-4 leading-relaxed">{insight.description}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-xs px-3 py-1 bg-neutral-100 text-neutral-700 rounded-full">
                      {insight.impact} impact
                    </span>
                    {insight.actionable && (
                      <span className="text-xs px-3 py-1 bg-neutral-100 text-neutral-700 rounded-full">
                        actionable
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actionable Recommendations */}
      <div>
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">What You Should Do Next</h2>
          <p className="text-neutral-600">Prioritized actions based on customer feedback</p>
        </div>
        <div className="space-y-6">
          {(analysis?.recommendations || []).map((rec, index) => (
            <div key={index} className="border border-neutral-200 rounded-lg p-6 border-l-4 border-l-neutral-900">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs px-3 py-1 bg-neutral-100 text-neutral-700 rounded-full">
                      {rec.priority} priority
                    </span>
                  </div>
                  <h3 className="font-semibold text-neutral-900 mb-2">{rec.action}</h3>
                  <p className="text-neutral-600 mb-3 leading-relaxed">{rec.reason}</p>
                  <p className="text-sm text-neutral-800 bg-neutral-50 rounded-lg p-3">{rec.impact}</p>
                </div>
                <Button size="sm" variant="outline" className="flex-shrink-0">
                  Plan Action
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnswerAnalysisTab; 