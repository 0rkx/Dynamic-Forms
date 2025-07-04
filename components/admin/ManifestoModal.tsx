import React, { useState, useEffect } from 'react';
import { X, Lightbulb, Brain, Plus, Trash2 } from 'lucide-react';
import { FormSchema, FormManifesto } from '../../types';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { Input } from '../ui/Input';

interface ManifestoModalProps {
    form: FormSchema;
    onClose: () => void;
  onSave: (manifestoText: string, manifestoData: Partial<FormManifesto>) => void;
}

type ConversationTone = 'friendly' | 'professional' | 'casual' | 'expert';

const ManifestoModal: React.FC<ManifestoModalProps> = ({ form, onClose, onSave }) => {
  const [manifestoData, setManifestoData] = useState({
        productVision: '',
        targetAudience: '',
        keyQuestionAreas: [''],
    conversationTone: 'friendly' as ConversationTone
    });
    const [isLoading, setIsLoading] = useState(false);
    
    // Prevent body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    // Initialize form data from existing manifesto
    useEffect(() => {
        if (form.manifestoData) {
      setManifestoData({
        productVision: form.manifestoData.productVision || '',
        targetAudience: form.manifestoData.targetAudience || '',
        keyQuestionAreas: form.manifestoData.keyQuestionAreas && 
          form.manifestoData.keyQuestionAreas.length > 0 ? 
          form.manifestoData.keyQuestionAreas : [''],
        conversationTone: (form.manifestoData.conversationTone || 'friendly') as ConversationTone
      });
        } else if (form.manifesto) {
      // Parse existing text manifesto if no structured data
            const lines = form.manifesto.split('\n').filter(line => line.trim());
            const productVision = lines[0] || '';
            const targetAudienceLine = lines.find(line => line.startsWith('Target Audience:'));
      const targetAudience = targetAudienceLine ? 
        targetAudienceLine.replace('Target Audience:', '').trim() : '';
            const keyAreasLine = lines.find(line => line.startsWith('Key Question Areas:'));
            const keyQuestionAreas = keyAreasLine ? 
        keyAreasLine.replace('Key Question Areas:', '').split(',')
          .map(area => area.trim()).filter(area => area) : [''];
            
      setManifestoData({
                productVision,
                targetAudience,
        keyQuestionAreas: keyQuestionAreas.length > 0 ? keyQuestionAreas : [''],
        conversationTone: 'friendly'
      });
        }
    }, [form.manifesto, form.manifestoData]);

    const handleGenerateAIManifesto = async () => {
        setIsLoading(true);
        try {
            // Import the AI manifesto generation function
            const { generateManifestoOnly } = await import('../../lib/formGenerator');
            
            // Create a comprehensive prompt that analyzes the form structure
            const questionDetails = form.questions?.map(q => {
                let detail = `- "${q.label}" (${q.type})`;
                if (q.options && q.options.length > 0) {
                    detail += ` with options: ${q.options.join(', ')}`;
                }
                return detail;
            }).join('\n') || 'No questions defined yet';
            
            const formPrompt = `
Analyze this form and create a strategic manifesto for intelligent follow-up questions:

Form Title: "${form.title}"
Form Description: "${form.description || 'No description provided'}"

Existing Questions:
${questionDetails}

Based on this form structure and purpose, create a manifesto that will guide AI to ask relevant follow-up questions.`;

            console.log('🤖 Generating AI manifesto for form:', form.title);
            
            const result = await generateManifestoOnly(formPrompt);
            
      if (result.success && result.manifestoData) {
                console.log('✅ AI manifesto generated successfully');
                
        setManifestoData({
          productVision: result.manifestoData.productVision || '',
          targetAudience: result.manifestoData.targetAudience || '',
          keyQuestionAreas: result.manifestoData.keyQuestionAreas && 
            result.manifestoData.keyQuestionAreas.length > 0 ? 
            result.manifestoData.keyQuestionAreas : [''],
          conversationTone: (result.manifestoData.conversationTone || 'friendly') as ConversationTone
        });
            } else {
                console.warn('❌ AI manifesto generation failed:', result.error);
                alert('Failed to generate AI manifesto. Please try again or create one manually.');
            }
        } catch (error) {
            console.error('❌ Error generating AI manifesto:', error);
            alert('An error occurred while generating the manifesto. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

  const handleAddKeyArea = () => {
    setManifestoData(prev => ({
      ...prev,
      keyQuestionAreas: [...prev.keyQuestionAreas, '']
    }));
  };

  const handleRemoveKeyArea = (index: number) => {
    setManifestoData(prev => ({
      ...prev,
      keyQuestionAreas: prev.keyQuestionAreas.filter((_, i) => i !== index)
    }));
  };

  const handleKeyAreaChange = (index: number, value: string) => {
    setManifestoData(prev => ({
      ...prev,
      keyQuestionAreas: prev.keyQuestionAreas.map((area, i) => 
        i === index ? value : area
      )
    }));
  };

    const handleSave = () => {
    // Create manifesto text for backwards compatibility
    const manifestoText = `${manifestoData.productVision}\n\nTarget Audience: ${manifestoData.targetAudience}\n\nKey Question Areas: ${manifestoData.keyQuestionAreas.join(', ')}`;
    
    // Create structured data
    const structuredData = {
      productVision: manifestoData.productVision,
      targetAudience: manifestoData.targetAudience,
      keyQuestionAreas: manifestoData.keyQuestionAreas.filter(area => area.trim()),
      conversationTone: manifestoData.conversationTone,
      businessGoals: [], // Empty for now, can be extended later
      successMetrics: [] // Empty for now, can be extended later
    };
    
    onSave(manifestoText, structuredData);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-8 animate-in fade-in-0">
            <div className="w-full max-w-3xl max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden relative animate-in zoom-in-95">
                <div className="flex items-center justify-between p-6 border-b bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Brain className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-neutral-900">AI Manifesto</h2>
                            <p className="text-sm text-neutral-600">Define your product vision to guide intelligent follow-ups</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-neutral-400 hover:text-neutral-600">
                        <X className="h-5 w-5" />
                    </Button>
                </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-130px)]">
                    <div className="space-y-6">
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Lightbulb className="h-5 w-5 text-blue-600" />
                                    <div>
                                        <h3 className="font-medium text-blue-900">AI-Generated Manifesto</h3>
                                        <p className="text-sm text-blue-700">Let AI create a manifesto based on your form</p>
                                    </div>
                                </div>
                                <Button 
                                    onClick={handleGenerateAIManifesto}
                                    disabled={isLoading}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    {isLoading ? 'Generating...' : 'Generate AI Manifesto'}
                                </Button>
                            </div>
                        </div>

            <div>
              <label htmlFor="product-vision" className="block text-sm font-medium text-neutral-700 mb-1">
                Product Vision
              </label>
                            <Textarea 
                id="product-vision"
                placeholder="Describe the core purpose and goals of this form"
                value={manifestoData.productVision}
                onChange={(e) => setManifestoData(prev => ({ ...prev, productVision: e.target.value }))}
                                rows={3}
                className="w-full"
                            />
                        </div>

            <div>
              <label htmlFor="target-audience" className="block text-sm font-medium text-neutral-700 mb-1">
                Target Audience
              </label>
                            <Textarea 
                id="target-audience"
                placeholder="Who is this form designed for?"
                value={manifestoData.targetAudience}
                onChange={(e) => setManifestoData(prev => ({ ...prev, targetAudience: e.target.value }))}
                rows={2}
                className="w-full"
                            />
                        </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-neutral-700">
                  Key Question Areas
                </label>
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                  onClick={handleAddKeyArea}
                  className="flex items-center gap-1 h-7 text-xs"
                >
                  <Plus className="h-3 w-3" />
                  Add Area
                </Button>
              </div>
              <div className="space-y-2">
                {manifestoData.keyQuestionAreas.map((area, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      placeholder={`Key question area ${index + 1}`}
                      value={area}
                      onChange={(e) => handleKeyAreaChange(index, e.target.value)}
                      className="flex-1"
                    />
                    {manifestoData.keyQuestionAreas.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveKeyArea(index)}
                        className="h-8 w-8 text-neutral-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Topics that follow-up questions should explore
              </p>
                        </div>

            {/* Removed Conversation Tone field UI (label, radio buttons, and surrounding container) */}
                    </div>
                </div>
                
                <div className="flex items-center justify-between p-6 border-t bg-neutral-50 sticky bottom-0">
                    <div className="text-sm text-neutral-600">
                        This manifesto guides AI to ask relevant follow-up questions
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleSave}
              disabled={!manifestoData.productVision.trim() || !manifestoData.targetAudience.trim()}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            Save Manifesto
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManifestoModal; 