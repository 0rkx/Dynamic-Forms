import React, { useState, useEffect } from 'react';
import { FormSchema } from '../../types';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { X, Brain, Target, Users, Lightbulb } from 'lucide-react';

interface ManifestoModalProps {
    form: FormSchema;
    onClose: () => void;
    onSave: (manifesto: string, manifestoData: any) => void;
}

const ManifestoModal: React.FC<ManifestoModalProps> = ({ form, onClose, onSave }) => {
    const [manifestoForm, setManifestoForm] = useState({
        productVision: '',
        targetAudience: '',
        coreValues: [''],
        keyQuestionAreas: [''],
        successMetrics: ['']
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
            setManifestoForm(prev => ({
                ...prev,
                productVision: form.manifestoData!.productVision || '',
                targetAudience: form.manifestoData!.targetAudience || '',
                keyQuestionAreas: form.manifestoData!.keyQuestionAreas.length > 0 ? 
                    form.manifestoData!.keyQuestionAreas : ['']
            }));
        } else if (form.manifesto) {
            const lines = form.manifesto.split('\n').filter(line => line.trim());
            const productVision = lines[0] || '';
            const targetAudienceLine = lines.find(line => line.startsWith('Target Audience:'));
            const targetAudience = targetAudienceLine ? targetAudienceLine.replace('Target Audience:', '').trim() : '';
            const keyAreasLine = lines.find(line => line.startsWith('Key Question Areas:'));
            const keyQuestionAreas = keyAreasLine ? 
                keyAreasLine.replace('Key Question Areas:', '').split(',').map(area => area.trim()).filter(area => area) : 
                [''];
            
            setManifestoForm(prev => ({
                ...prev,
                productVision,
                targetAudience,
                keyQuestionAreas: keyQuestionAreas.length > 0 ? keyQuestionAreas : ['']
            }));
        }
    }, [form.manifesto, form.manifestoData]);

    const handleManifestoField = (field: string, value: string) => {
        setManifestoForm(prev => ({ ...prev, [field]: value }));
    };

    const handleManifestoArrayField = (field: string, index: number, value: string) => {
        setManifestoForm(prev => ({
            ...prev,
            [field]: (prev[field as keyof typeof prev] as string[]).map((item: string, i: number) => i === index ? value : item)
        }));
    };

    const handleManifestoAddArrayField = (field: string) => {
        setManifestoForm(prev => ({ ...prev, [field]: [...(prev[field as keyof typeof prev] as string[]), ''] }));
    };

    const handleManifestoRemoveArrayField = (field: string, index: number) => {
        setManifestoForm(prev => ({ ...prev, [field]: (prev[field as keyof typeof prev] as string[]).filter((_, i: number) => i !== index) }));
    };

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
                if (q.placeholder) {
                    detail += ` (placeholder: ${q.placeholder})`;
                }
                return detail;
            }).join('\n') || 'No questions defined yet';
            
            const formPrompt = `
Analyze this form and create a strategic manifesto for intelligent follow-up questions:

Form Title: "${form.title}"
Form Description: "${form.description || 'No description provided'}"

Existing Questions:
${questionDetails}

Based on this form structure and purpose, create a manifesto that will guide AI to ask relevant follow-up questions. Consider:
- What insights would be most valuable to gather?
- Who is the target audience based on the question types and content?
- What business goals does this form serve?
- What additional areas could be explored with follow-up questions?

Focus on creating a manifesto that leverages the existing question structure to generate meaningful follow-ups.`;

            console.log('🤖 Generating AI manifesto for form:', form.title);
            
            const result = await generateManifestoOnly(formPrompt);
            
            if (result.success && (result.manifesto || result.manifestoData)) {
                console.log('✅ AI manifesto generated successfully');
                
                // Use structured data from API if available, otherwise parse text
                if (result.manifestoData) {
                    setManifestoForm(prev => ({
                        ...prev,
                        productVision: result.manifestoData.productVision || prev.productVision,
                        targetAudience: result.manifestoData.targetAudience || prev.targetAudience,
                        keyQuestionAreas: result.manifestoData.keyQuestionAreas && result.manifestoData.keyQuestionAreas.length > 0 
                            ? result.manifestoData.keyQuestionAreas 
                            : prev.keyQuestionAreas
                    }));
                } else if (result.manifesto) {
                    // Fallback: Parse the generated manifesto text to extract structured data
                    const lines = result.manifesto.split('\n').filter(line => line.trim());
                    
                    // Try to extract structured information from the generated manifesto
                    let productVision = '';
                    let targetAudience = '';
                    let businessGoals: string[] = [];
                    let keyQuestionAreas: string[] = [];
                    
                    // Parse the manifesto text
                    let currentSection = '';
                    for (const line of lines) {
                        if (line.includes('Vision:') || line.includes('Product Vision:')) {
                            currentSection = 'vision';
                            productVision = line.replace(/(Vision:|Product Vision:)/i, '').trim();
                        } else if (line.includes('Audience:') || line.includes('Target Audience:')) {
                            currentSection = 'audience';
                            targetAudience = line.replace(/(Audience:|Target Audience:)/i, '').trim();
                        } else if (line.includes('Goals:') || line.includes('Business Goals:')) {
                            currentSection = 'goals';
                            const goalText = line.replace(/(Goals:|Business Goals:)/i, '').trim();
                            if (goalText) {
                                businessGoals = goalText.split(',').map(g => g.trim()).filter(g => g);
                            }
                        } else if (line.includes('Areas:') || line.includes('Question Areas:') || line.includes('Key Areas:')) {
                            currentSection = 'areas';
                            const areaText = line.replace(/(Areas:|Question Areas:|Key Areas:)/i, '').trim();
                            if (areaText) {
                                keyQuestionAreas = areaText.split(',').map(a => a.trim()).filter(a => a);
                            }
                        } else if (line.trim() && currentSection) {
                            // Continue adding to current section
                            if (currentSection === 'vision' && !productVision) {
                                productVision = line.trim();
                            } else if (currentSection === 'audience' && !targetAudience) {
                                targetAudience = line.trim();
                            }
                        }
                    }
                    
                    // Fallback: if parsing didn't work well, use the first part as product vision
                    if (!productVision && lines.length > 0) {
                        productVision = lines[0];
                    }
                    
                    // If we still don't have target audience, try to infer from questions
                    if (!targetAudience) {
                        targetAudience = "Users interested in " + (form.title?.toLowerCase() || "this service");
                    }
                    
                    // If no key question areas were extracted, create some based on question types
                    if (keyQuestionAreas.length === 0) {
                        const questionTypes = form.questions?.map(q => q.type) || [];
                        if (questionTypes.includes('rating')) keyQuestionAreas.push('satisfaction levels');
                        if (questionTypes.includes('multiple-choice')) keyQuestionAreas.push('preferences');
                        if (questionTypes.includes('textarea')) keyQuestionAreas.push('detailed insights');
                        if (questionTypes.includes('email')) keyQuestionAreas.push('contact preferences');
                        
                        // Add generic areas if still empty
                        if (keyQuestionAreas.length === 0) {
                            keyQuestionAreas = ['user needs', 'preferences', 'expectations'];
                        }
                    }
                    
                    setManifestoForm(prev => ({
                        ...prev,
                        productVision: productVision || prev.productVision,
                        targetAudience: targetAudience || prev.targetAudience,
                        keyQuestionAreas: keyQuestionAreas.length > 0 ? keyQuestionAreas : prev.keyQuestionAreas
                    }));
                }
            } else {
                console.warn('❌ AI manifesto generation failed:', result.error);
                // Show user-friendly error message
                alert('Failed to generate AI manifesto. Please try again or create one manually.');
            }
        } catch (error) {
            console.error('❌ Error generating AI manifesto:', error);
            alert('An error occurred while generating the manifesto. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = () => {
        const manifestoText = manifestoForm.productVision + '\n\nTarget Audience: ' + manifestoForm.targetAudience;
        const manifestoData = {
            productVision: manifestoForm.productVision,
            targetAudience: manifestoForm.targetAudience,
            businessGoals: [],
            keyQuestionAreas: manifestoForm.keyQuestionAreas.filter(area => area.trim()),
            conversationTone: 'friendly' as const
        };
        
        onSave(manifestoText, manifestoData);
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

                <div className="flex-1 overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 140px)' }}>
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

                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Target className="h-4 w-4 text-neutral-600" />
                                <label className="block text-sm font-medium text-gray-700">Product Vision *</label>
                            </div>
                            <Textarea 
                                value={manifestoForm.productVision} 
                                onChange={e => handleManifestoField('productVision', e.target.value)} 
                                placeholder="What is your product's core purpose and vision? What do you want to achieve with this form?"
                                rows={3}
                                className="resize-none"
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-neutral-600" />
                                <label className="block text-sm font-medium text-gray-700">Target Audience *</label>
                            </div>
                            <Textarea 
                                value={manifestoForm.targetAudience} 
                                onChange={e => handleManifestoField('targetAudience', e.target.value)} 
                                placeholder="Who are your primary users? Describe their characteristics, needs, and context."
                                rows={3}
                                className="resize-none"
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-gray-700">Key Question Areas</label>
                            <p className="text-xs text-gray-500">Topics the AI should focus on when generating follow-up questions</p>
                            {manifestoForm.keyQuestionAreas.map((area, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <input 
                                        type="text" 
                                        value={area} 
                                        onChange={e => handleManifestoArrayField('keyQuestionAreas', i, e.target.value)} 
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                                        placeholder={'Key area ' + (i + 1)}
                                    />
                                    {manifestoForm.keyQuestionAreas.length > 1 && (
                                        <Button 
                                            onClick={() => handleManifestoRemoveArrayField('keyQuestionAreas', i)} 
                                            variant="outline" 
                                            size="sm"
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                            ×
                                        </Button>
                                    )}
                                </div>
                            ))}
                            <Button 
                                onClick={() => handleManifestoAddArrayField('keyQuestionAreas')} 
                                variant="outline" 
                                size="sm"
                                className="mt-2"
                            >
                                + Add Area
                            </Button>
                        </div>

                        {(manifestoForm.productVision || manifestoForm.targetAudience) && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <h4 className="font-medium text-green-900 mb-3">Manifesto Preview</h4>
                                <div className="space-y-2 text-sm">
                                    {manifestoForm.productVision && (
                                        <p><strong className="text-green-800">Vision:</strong> <span className="text-green-700">{manifestoForm.productVision}</span></p>
                                    )}
                                    {manifestoForm.targetAudience && (
                                        <p><strong className="text-green-800">Audience:</strong> <span className="text-green-700">{manifestoForm.targetAudience}</span></p>
                                    )}
                                    {manifestoForm.keyQuestionAreas.filter(area => area.trim()).length > 0 && (
                                        <p><strong className="text-green-800">Key Areas:</strong> <span className="text-green-700">{manifestoForm.keyQuestionAreas.filter(area => area.trim()).join(', ')}</span></p>
                                    )}
                                </div>
                            </div>
                        )}
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
                            disabled={!manifestoForm.productVision.trim() || !manifestoForm.targetAudience.trim()}
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