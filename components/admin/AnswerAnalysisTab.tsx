import React, { useState, useEffect, useRef } from 'react';
import { FormSchema, FormResponse, ManifestoAnalysisResult } from '../../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { Brain, ThumbsUp, ThumbsDown, Lightbulb, Target, RefreshCw, CheckCircle, AlertTriangle, Clock, Users, ArrowRight } from 'lucide-react';
import { analyzeManifestoResponses } from '../../lib/gemini';
import { BulkResponseAnalysisCache } from '../../lib/utils';
import { supabaseService } from '../../lib/supabaseService';

// Local browser cache TTL (5 minutes)
const LOCAL_TTL_MS = 5 * 60 * 1000;

interface AnswerAnalysisTabProps {
  form: FormSchema;
  responses: FormResponse[];
}

const AnswerAnalysisTab: React.FC<AnswerAnalysisTabProps> = ({ form, responses }) => {
  const [analysis, setAnalysis] = useState<ManifestoAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const isAnalyzingRef = useRef(false);
  const currentResponsesHashRef = useRef<string>('');

  // Validate analysis structure to prevent runtime errors
  const validateAnalysisStructure = (analysis: any): ManifestoAnalysisResult => {
    if (!analysis || typeof analysis !== 'object') {
      throw new Error('Invalid analysis structure: analysis is not an object');
    }

    return {
      overview: analysis.overview || {
        totalResponses: 0,
        manifestoAlignment: 'low' as const,
        topPriority: 'No analysis available'
      },
      whatPeopleLike: Array.isArray(analysis.whatPeopleLike) ? analysis.whatPeopleLike : [],
      whatPeopleDislike: Array.isArray(analysis.whatPeopleDislike) ? analysis.whatPeopleDislike : [],
      actionableInsights: Array.isArray(analysis.actionableInsights) ? analysis.actionableInsights : [],
      recommendedActions: Array.isArray(analysis.recommendedActions) ? analysis.recommendedActions : []
    };
  };

  // Early return if form or responses are not properly loaded
  if (!form || !responses || !Array.isArray(responses)) {
    return (
      <div className="text-center py-24 px-8">
        <div className="w-24 h-24 bg-neutral-100 rounded-lg mx-auto mb-8 flex items-center justify-center">
          <Brain className="h-12 w-12 text-neutral-600" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 mb-4">Loading...</h2>
        <p className="text-neutral-600">Preparing analysis data...</p>
      </div>
    );
  }

  const analyzeResponses = async (forceRefresh = false) => {
    if (isAnalyzingRef.current || responses.length === 0) return;
    
    const responsesHash = JSON.stringify(responses.map(r => r?.id || '').filter(id => id).sort());

    const localCacheKey = `ai_analysis_${form.id}_${responsesHash}`;

    // 1️⃣ Check in-memory cache (survives tab switches)
    const memCached = (BulkResponseAnalysisCache as any)?.[localCacheKey];
    if (!forceRefresh && memCached) {
      try {
        const validatedCached = validateAnalysisStructure(memCached);
        setAnalysis(validatedCached);
        setError(null);
        currentResponsesHashRef.current = responsesHash;
        return;
      } catch (validationError) {
        console.warn('Cached analysis validation failed:', validationError);
        // Continue to fresh analysis
      }
    }

    // 2️⃣ Check localStorage (within TTL)
    if (!forceRefresh) {
      const localRaw = localStorage.getItem(localCacheKey);
      if (localRaw) {
        try {
          const parsed = JSON.parse(localRaw);
          if (Date.now() - parsed.timestamp < LOCAL_TTL_MS) {
            const validatedData = validateAnalysisStructure(parsed.data);
            setAnalysis(validatedData);
            setError(null);
            (BulkResponseAnalysisCache as any)[localCacheKey] = validatedData;
            currentResponsesHashRef.current = responsesHash;
            return;
          }
        } catch (validationError) {
          console.warn('Local cache validation failed:', validationError);
        }
      }
    }
    
    if (!forceRefresh && currentResponsesHashRef.current === responsesHash && analysis) {
      return;
    }
    
    // Check database cache first
    if (!forceRefresh) {
      try {
        const cacheKey = `manifesto_analysis_${form.id}_${responsesHash}`;
        const cachedAnalysis = await supabaseService.getAnalysisCache(cacheKey);
        if (cachedAnalysis) {
          console.log('Using database-cached manifesto analysis');
          try {
            const validatedCached = validateAnalysisStructure(cachedAnalysis);
            setAnalysis(validatedCached);
            setError(null);
            currentResponsesHashRef.current = responsesHash;
            return;
          } catch (validationError) {
            console.warn('Database cache validation failed:', validationError);
            // Continue to fresh analysis
          }
        }
      } catch (cacheError) {
        console.warn('Failed to check database cache:', cacheError);
      }
    }
    
    setIsAnalyzing(true);
    setError(null);
    isAnalyzingRef.current = true;
    
    try {
      console.log('Starting manifesto-aware AI analysis...');
      const aiAnalysis = await analyzeManifestoResponses(form, responses);
      
      // Validate the analysis structure
      const validatedAnalysis = validateAnalysisStructure(aiAnalysis);
      
      // Store in database cache for 24 hours
      try {
        const cacheKey = `manifesto_analysis_${form.id}_${responsesHash}`;
        await supabaseService.setAnalysisCache(cacheKey, validatedAnalysis, 24);
        console.log('Manifesto analysis cached in database');
      } catch (dbCacheError) {
        console.warn('Failed to cache manifesto analysis in database:', dbCacheError);
      }
      
      setAnalysis(validatedAnalysis);
      setError(null);
      // Save to caches
      (BulkResponseAnalysisCache as any)[localCacheKey] = validatedAnalysis;
      localStorage.setItem(localCacheKey, JSON.stringify({ timestamp: Date.now(), data: validatedAnalysis }));
      setRetryCount(0);
      currentResponsesHashRef.current = responsesHash;
      
      console.log('Manifesto analysis completed and cached');
    } catch (error: any) {
      console.error('Failed to analyze responses with manifesto:', error);
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

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAlignmentColor = (alignment: string) => {
    switch (alignment) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  /* -------------------------- UI HELPERS -------------------------- */

  interface CollapsibleCardProps {
    title: string;
    impact: string;
    evidence: string[];
    manifestoConnection: string;
    color: 'green' | 'red';
  }

  const CollapsibleCard: React.FC<CollapsibleCardProps> = ({ title, impact, evidence, manifestoConnection, color }) => {
    const [open, setOpen] = useState(false);

    const borderColor = color === 'green' ? 'border-l-green-500' : 'border-l-red-500';
    const bgEvidence = color === 'green' ? 'bg-green-50' : 'bg-red-50';
    const evidenceBullet = color === 'green' ? 'text-green-500' : 'text-red-500';
    const evidenceText = color === 'green' ? 'text-green-700' : 'text-red-700';
    const evidenceHeading = color === 'green' ? 'text-green-800' : 'text-red-800';

    return (
      <Card className={`border-l-4 ${borderColor}`}>
        <CardContent className="p-4">
          <div
            className="flex items-start justify-between cursor-pointer"
            onClick={() => setOpen(!open)}
          >
            <h4 className="font-semibold text-neutral-900 mr-4 flex-1 select-none">
              {title}
            </h4>
            <span
              className={`text-xs px-2 py-1 rounded-full ${getImpactColor(impact)}`}
            >
              {impact} impact
            </span>
          </div>

          {open && (
            <div className="space-y-3 mt-3">
              <div className={`${bgEvidence} rounded-lg p-3`}>
                <p className={`text-sm ${evidenceHeading} font-medium mb-1`}>Evidence:</p>
                <ul className={`text-sm ${evidenceText} space-y-1`}>
                  {(evidence || []).map((ev, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className={`${evidenceBullet} mr-2`}>•</span>
                      {ev}
                    </li>
                  ))}
                </ul>
                {(!evidence || evidence.length === 0) && (
                  <p className={`text-sm ${evidenceText} italic`}>No evidence available</p>
                )}
              </div>

              <div className="bg-neutral-50 rounded-lg p-3">
                <p className="text-sm text-neutral-600">
                  <strong>Manifesto Connection:</strong> {manifestoConnection}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (responses.length === 0) {
    return (
      <div className="text-center py-24 px-8">
        <div className="w-24 h-24 bg-neutral-100 rounded-lg mx-auto mb-8 flex items-center justify-center">
          <Brain className="h-12 w-12 text-neutral-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-neutral-900 mb-4">Ready for Manifesto Analysis</h2>
        <p className="text-neutral-600 mb-8 max-w-2xl mx-auto">
          Once responses start coming in, I'll analyze them against your manifesto to discover what people really like and dislike, plus actionable insights to help you improve.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <div className="border border-neutral-200 rounded-lg p-6">
            <div className="w-12 h-12 bg-green-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <ThumbsUp className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-neutral-900 mb-2">What People Like</h3>
            <p className="text-sm text-neutral-600">Discover what resonates with your audience</p>
          </div>
          
          <div className="border border-neutral-200 rounded-lg p-6">
            <div className="w-12 h-12 bg-red-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <ThumbsDown className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="font-semibold text-neutral-900 mb-2">What People Dislike</h3>
            <p className="text-sm text-neutral-600">Identify pain points and areas for improvement</p>
          </div>
        </div>
        
        <div className="mt-12">
          <div className="inline-flex items-center px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg text-sm">
            <Brain className="h-4 w-4 mr-2" />
            Waiting for responses to analyze against your manifesto...
          </div>
        </div>
      </div>
    );
  }

  if (error && !analysis) {
    return (
      <div className="text-center py-24 px-8">
        <div className="w-24 h-24 bg-red-50 rounded-lg mx-auto mb-8 flex items-center justify-center">
          <AlertTriangle className="h-12 w-12 text-red-500" />
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
        
        <h2 className="text-2xl font-bold text-neutral-900 mb-4">Manifesto Analysis in Progress</h2>
        <p className="text-neutral-600 mb-8 max-w-2xl mx-auto">
          Analyzing {responses.length} responses against your manifesto to discover what people really like and dislike...
        </p>
        
        <div className="max-w-md mx-auto">
          <div className="space-y-4">
            <div className="flex items-center text-sm">
              <div className="w-2 h-2 bg-neutral-400 rounded-full mr-3"></div>
              <span className="text-neutral-700">Analyzing against manifesto...</span>
            </div>
            <div className="flex items-center text-sm">
              <div className="w-2 h-2 bg-neutral-400 rounded-full mr-3"></div>
              <span className="text-neutral-700">Identifying likes & dislikes...</span>
            </div>
            <div className="flex items-center text-sm">
              <div className="w-2 h-2 bg-neutral-400 rounded-full mr-3"></div>
              <span className="text-neutral-700">Generating actionable insights...</span>
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-xs text-neutral-500">
          This usually takes 15-30 seconds
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="space-y-8">
      {/* Optional retry alert */}
      {error && (
        <div className="border border-neutral-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-neutral-700 text-sm">
              <AlertTriangle className="h-4 w-4" />
              Showing cached analysis. Latest analysis failed.
            </div>
            <Button size="sm" variant="outline" onClick={handleRetry} disabled={isAnalyzing}>
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Answer Garden Style: What People Like vs Dislike */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* What People Like */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <ThumbsUp className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-neutral-900">What People Like</h3>
          </div>
          
          <div className="space-y-4">
            {(analysis.whatPeopleLike || []).map((item, index) => (
              <CollapsibleCard
                key={index}
                title={item.insight}
                impact={item.impact}
                evidence={item.evidence}
                manifestoConnection={item.manifestoConnection}
                color="green"
              />
            ))}
            {(!analysis.whatPeopleLike || analysis.whatPeopleLike.length === 0) && (
              <div className="text-neutral-500 text-center py-8">
                <p>No positive insights found in the analysis.</p>
              </div>
            )}
          </div>
        </div>

        {/* What People Dislike */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <ThumbsDown className="h-5 w-5 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-neutral-900">What People Dislike</h3>
          </div>
          
          <div className="space-y-4">
            {(analysis.whatPeopleDislike || []).map((item, index) => (
              <CollapsibleCard
                key={index}
                title={item.problem}
                impact={item.impact}
                evidence={item.evidence}
                manifestoConnection={item.manifestoConnection}
                color="red"
              />
            ))}
            {(!analysis.whatPeopleDislike || analysis.whatPeopleDislike.length === 0) && (
              <div className="text-neutral-500 text-center py-8">
                <p>No negative insights found in the analysis.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actionable Insights */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Lightbulb className="h-5 w-5 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-neutral-900">Actionable Insights</h3>
        </div>
        
        <div className="grid gap-6">
          {(analysis.actionableInsights || []).map((insight, index) => (
            <Card key={index} className={`border-l-4 ${getPriorityColor(insight.priority).replace('bg-', 'border-l-').replace('text-', 'border-l-').replace('100', '500')}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h4 className="font-semibold text-neutral-900 text-lg">{insight.title}</h4>
                  <div className="flex gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(insight.priority)}`}>
                      {insight.priority} priority
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${getEffortColor(insight.effort)}`}>
                      {insight.effort} effort
                    </span>
                  </div>
                </div>
                
                <p className="text-neutral-600 mb-4 leading-relaxed">{insight.description}</p>
                
                <div className="bg-neutral-50 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-neutral-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-neutral-900 mb-1">Action:</p>
                      <p className="text-sm text-neutral-700">{insight.action}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Expected Impact:</strong> {insight.expectedImpact}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
          {(!analysis.actionableInsights || analysis.actionableInsights.length === 0) && (
            <div className="text-neutral-500 text-center py-8">
              <p>No actionable insights found in the analysis.</p>
            </div>
          )}
        </div>
      </div>

      {/* Recommended Actions */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <Target className="h-5 w-5 text-purple-600" />
          </div>
          <h3 className="text-xl font-bold text-neutral-900">Recommended Actions</h3>
        </div>
        
        <div className="space-y-4">
          {(analysis.recommendedActions || []).map((action, index) => (
            <Card key={index} className="border-l-4 border-l-purple-500">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h4 className="font-semibold text-neutral-900 text-lg">{action.action}</h4>
                  <div className="flex items-center gap-2 text-sm text-neutral-600">
                    <Clock className="h-4 w-4" />
                    {action.timeframe}
                  </div>
                </div>
                
                <p className="text-neutral-600 mb-4 leading-relaxed">{action.reason}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-neutral-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-neutral-900 mb-2">Resources Needed:</p>
                    <ul className="text-sm text-neutral-700 space-y-1">
                      {(action.resources || []).map((resource, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-neutral-500 mr-2">•</span>
                          {resource}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-green-900 mb-2">Success Metric:</p>
                    <p className="text-sm text-green-800">{action.success_metric}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {(!analysis.recommendedActions || analysis.recommendedActions.length === 0) && (
            <div className="text-neutral-500 text-center py-8">
              <p>No recommended actions found in the analysis.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnswerAnalysisTab; 