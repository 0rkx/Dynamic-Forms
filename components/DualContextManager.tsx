import React, { useState, useEffect } from 'react';
import { FormSchema, UserManifestoContext, CachedFormContext } from '../types';
import { dualContextService } from '../lib/dualContextService';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { Textarea } from './ui/Textarea';
import { Brain, Target, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

interface DualContextManagerProps {
  formSchema: FormSchema;
  onManifestoUpdate: (manifesto: UserManifestoContext) => void;
}

/**
 * Dual-Context Manager
 * 
 * This component manages the setup and monitoring of the dual-context system.
 * It helps users configure their manifesto and shows insights about context performance.
 */
export const DualContextManager: React.FC<DualContextManagerProps> = ({
  formSchema,
  onManifestoUpdate
}) => {
  const [manifestoContext, setManifestoContext] = useState<UserManifestoContext | null>(null);
  const [formContext, setFormContext] = useState<CachedFormContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [insights, setInsights] = useState<{
    manifestoUtilization: number;
    contextRichness: number;
    aiEffectiveness: number;
    recommendations: string[];
  } | null>(null);

  // Form state for manifesto editing
  const [manifestoForm, setManifestoForm] = useState({
    productVision: '',
    targetAudience: '',
    coreValues: [''],
    businessGoals: [''],
    keyQuestionAreas: [''],
    conversationTone: 'friendly' as UserManifestoContext['conversationTone'],
    successMetrics: ['']
  });

  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadDualContext();
  }, [formSchema.id]);

  const loadDualContext = async () => {
    try {
      setIsLoading(true);
      
      // Load manifesto context
      const manifesto = await dualContextService.getManifestoContext(formSchema.id);
      if (manifesto) {
        setManifestoContext(manifesto);
        setManifestoForm(manifesto);
      } else if (formSchema.manifesto) {
        // Try to parse existing manifesto
        const parsed = dualContextService.parseManifestoText(formSchema.manifesto);
        if (parsed.productVision) {
          setManifestoForm({
            productVision: parsed.productVision,
            targetAudience: parsed.targetAudience || '',
            coreValues: parsed.coreValues || [''],
            businessGoals: parsed.businessGoals || [''],
            keyQuestionAreas: parsed.keyQuestionAreas || [''],
            conversationTone: 'friendly',
            successMetrics: parsed.successMetrics || ['']
          });
          setIsEditing(true); // Show editing mode if we have a basic manifesto to enhance
        }
      }

      // Load form context
      const context = await dualContextService.getCachedFormContext(formSchema.id);
      setFormContext(context);

      // Load insights
      const contextInsights = await dualContextService.getContextInsights(formSchema.id);
      setInsights(contextInsights);
      
    } catch (error) {
      console.error('Error loading dual context:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveManifestoContext = async () => {
    try {
      setIsSaving(true);
      
      const manifestoToSave: UserManifestoContext = {
        ...manifestoForm,
        coreValues: manifestoForm.coreValues.filter(v => v.trim()),
        businessGoals: manifestoForm.businessGoals.filter(g => g.trim()),
        keyQuestionAreas: manifestoForm.keyQuestionAreas.filter(q => q.trim()),
        successMetrics: manifestoForm.successMetrics.filter(s => s.trim())
      };

      await dualContextService.saveManifestoContext(formSchema.id, manifestoToSave);
      setManifestoContext(manifestoToSave);
      onManifestoUpdate(manifestoToSave);
      setIsEditing(false);
      
      // Reload insights after saving
      await loadDualContext();
      
    } catch (error) {
      console.error('Error saving manifesto context:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const addArrayField = (field: keyof typeof manifestoForm, value: string = '') => {
    setManifestoForm(prev => ({
      ...prev,
      [field]: [...prev[field] as string[], value]
    }));
  };

  const updateArrayField = (field: keyof typeof manifestoForm, index: number, value: string) => {
    setManifestoForm(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).map((item, i) => i === index ? value : item)
    }));
  };

  const removeArrayField = (field: keyof typeof manifestoForm, index: number) => {
    setManifestoForm(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).filter((_, i) => i !== index)
    }));
  };

  if (isLoading) {
    return (
      <Card className="border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <Brain className="h-6 w-6 text-blue-600 animate-pulse" />
            <div>
              <h3 className="font-semibold text-gray-900">Loading Dual-Context System...</h3>
              <p className="text-sm text-gray-600">Checking AI intelligence configuration</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Status Overview */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Brain className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Dual-Context AI System</h3>
                <p className="text-sm text-gray-600">Smart question generation with context awareness</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {insights ? Math.round((insights.manifestoUtilization + insights.contextRichness + insights.aiEffectiveness) / 3) : 0}%
              </div>
              <div className="text-xs text-gray-500">Overall Intelligence</div>
            </div>
          </div>

          {insights && (
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
                <div className="text-xl font-bold text-green-600">{insights.manifestoUtilization}%</div>
                <div className="text-xs text-gray-600 flex items-center justify-center mt-1">
                  <Target className="h-3 w-3 mr-1" />
                  Manifesto Setup
                </div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
                <div className="text-xl font-bold text-blue-600">{insights.contextRichness}%</div>
                <div className="text-xs text-gray-600 flex items-center justify-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Context Richness
                </div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
                <div className="text-xl font-bold text-purple-600">{insights.aiEffectiveness}%</div>
                <div className="text-xs text-gray-600 flex items-center justify-center mt-1">
                  <Brain className="h-3 w-3 mr-1" />
                  AI Effectiveness
                </div>
              </div>
            </div>
          )}

          {insights && insights.recommendations.length > 0 && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Recommendations:</p>
                  <ul className="text-sm text-amber-700 mt-1 space-y-1">
                    {insights.recommendations.map((rec, index) => (
                      <li key={index}>• {rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manifesto Context Configuration */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-semibold text-gray-900">User Manifesto Context</h4>
              <p className="text-sm text-gray-600">Define your product vision to guide AI question generation</p>
            </div>
            {manifestoContext && !isEditing && (
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                size="sm"
              >
                Edit Manifesto
              </Button>
            )}
          </div>

          {!manifestoContext && !isEditing ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <Brain className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Set Up Your Product Manifesto</h3>
              <p className="text-gray-600 mb-4 max-w-md mx-auto">
                Help the AI understand your product vision and generate more relevant, strategic questions.
              </p>
              <Button
                onClick={() => setIsEditing(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Configure Manifesto
              </Button>
            </div>
          ) : isEditing ? (
            <div className="space-y-6">
              {/* Product Vision */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Vision *
                </label>
                <Textarea
                  value={manifestoForm.productVision}
                  onChange={(e) => setManifestoForm(prev => ({ ...prev, productVision: e.target.value }))}
                  placeholder="What is your product's core purpose and vision? (e.g., 'Help small businesses manage customer relationships more effectively')"
                  className="w-full"
                  rows={3}
                />
              </div>

              {/* Target Audience */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Audience *
                </label>
                <Textarea
                  value={manifestoForm.targetAudience}
                  onChange={(e) => setManifestoForm(prev => ({ ...prev, targetAudience: e.target.value }))}
                  placeholder="Who are your primary users? (e.g., 'Small business owners with 5-50 employees who struggle with manual processes')"
                  className="w-full"
                  rows={2}
                />
              </div>

              {/* Business Goals */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Goals
                </label>
                {manifestoForm.businessGoals.map((goal, index) => (
                  <div key={index} className="flex space-x-2 mb-2">
                    <Textarea
                      value={goal}
                      onChange={(e) => updateArrayField('businessGoals', index, e.target.value)}
                      placeholder="Enter a business goal..."
                      className="flex-1"
                      rows={1}
                    />
                    {manifestoForm.businessGoals.length > 1 && (
                      <Button
                        onClick={() => removeArrayField('businessGoals', index)}
                        variant="outline"
                        size="sm"
                        className="px-2"
                      >
                        ×
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  onClick={() => addArrayField('businessGoals')}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  + Add Goal
                </Button>
              </div>

              {/* Key Question Areas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Key Question Areas
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  What topics should the AI focus on? (e.g., "pricing", "user workflow", "feature priorities")
                </p>
                {manifestoForm.keyQuestionAreas.map((area, index) => (
                  <div key={index} className="flex space-x-2 mb-2">
                    <input
                      type="text"
                      value={area}
                      onChange={(e) => updateArrayField('keyQuestionAreas', index, e.target.value)}
                      placeholder="Enter a key question area..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {manifestoForm.keyQuestionAreas.length > 1 && (
                      <Button
                        onClick={() => removeArrayField('keyQuestionAreas', index)}
                        variant="outline"
                        size="sm"
                        className="px-2"
                      >
                        ×
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  onClick={() => addArrayField('keyQuestionAreas')}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  + Add Area
                </Button>
              </div>

              {/* Conversation Tone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Conversation Tone
                </label>
                <select
                  value={manifestoForm.conversationTone}
                  onChange={(e) => setManifestoForm(prev => ({ ...prev, conversationTone: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="friendly">Friendly & Approachable</option>
                  <option value="professional">Professional & Direct</option>
                  <option value="casual">Casual & Conversational</option>
                  <option value="expert">Expert & Technical</option>
                </select>
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={saveManifestoContext}
                  disabled={isSaving || !manifestoForm.productVision || !manifestoForm.targetAudience}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSaving ? 'Saving...' : 'Save Manifesto'}
                </Button>
                <Button
                  onClick={() => setIsEditing(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-green-900">Manifesto Configured</h4>
                  <p className="text-sm text-green-700 mt-1">
                    <strong>Vision:</strong> {manifestoContext?.productVision}
                  </p>
                  <p className="text-sm text-green-700">
                    <strong>Audience:</strong> {manifestoContext?.targetAudience}
                  </p>
                  {manifestoContext?.businessGoals && manifestoContext.businessGoals.length > 0 && (
                    <p className="text-sm text-green-700">
                      <strong>Goals:</strong> {manifestoContext.businessGoals.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Context Status */}
      {formContext && (
        <Card>
          <CardContent className="p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Form Context (Auto-Generated)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{formContext.totalEntries}</div>
                <div className="text-sm text-blue-700">Context Entries</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{formContext.topThemes.length}</div>
                <div className="text-sm text-purple-700">Identified Themes</div>
              </div>
            </div>
            
            {formContext.topThemes.length > 0 && (
              <div className="mt-4">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Top Conversation Themes:</h5>
                <div className="flex flex-wrap gap-2">
                  {formContext.topThemes.slice(0, 5).map((theme, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {theme.theme} ({theme.frequency})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 