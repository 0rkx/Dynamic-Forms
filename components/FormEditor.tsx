import React, { useState, useEffect } from 'react';
import { FormSchema, Question, UserManifestoContext } from '../types';
import { Button } from './ui/Button';
import { QuestionEditorCard } from './admin/QuestionEditorCard';
import { DualContextManager } from './DualContextManager';
import { PlusCircle, Info, Save, Check, Brain, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Textarea } from './ui/Textarea';
import { cn } from '../lib/utils';


interface FormEditorProps {
    schema: FormSchema;
    onSchemaChange: (newSchema: FormSchema) => void;
}

const FormEditor: React.FC<FormEditorProps> = ({ schema, onSchemaChange }) => {
    const [showIntelligentInfo, setShowIntelligentInfo] = useState(false);
    const [manifestoValue, setManifestoValue] = useState(schema.manifesto || '');
    const [manifestoSaved, setManifestoSaved] = useState(true);
    const [showDualContext, setShowDualContext] = useState(!!schema.intelligentFollowUps);
    
    const [manifestoForm, setManifestoForm] = useState({
        productVision: '',
        targetAudience: '',
        businessGoals: [''],
        keyQuestionAreas: [''],
        conversationTone: 'friendly' as const
    });
    const [isEditingManifesto, setIsEditingManifesto] = useState(false);
    const [isManifestoLoading, setIsManifestoLoading] = useState(false);

    // Sync manifesto value when schema changes externally
    useEffect(() => {
        if (schema.manifesto !== manifestoValue) {
            setManifestoValue(schema.manifesto || '');
            setManifestoSaved(true);
        }
    }, [schema.manifesto]);

    // On mount, parse existing manifesto or show editing mode
    useEffect(() => {
        if (schema.manifestoData) {
            // Use structured manifesto data if available
            setManifestoForm(prev => ({
                ...prev,
                productVision: schema.manifestoData!.productVision || '',
                targetAudience: schema.manifestoData!.targetAudience || '',
                businessGoals: schema.manifestoData!.businessGoals && schema.manifestoData!.businessGoals.length > 0 ?
                    schema.manifestoData!.businessGoals : [''],
                keyQuestionAreas: schema.manifestoData!.keyQuestionAreas && schema.manifestoData!.keyQuestionAreas.length > 0 ?
                    schema.manifestoData!.keyQuestionAreas : ['']
            }));
        } else if (schema.manifesto) {
            // Parse existing text manifesto
            const lines = schema.manifesto.split('\n').filter(line => line.trim());
            const productVision = lines[0] || '';
            const targetAudienceLine = lines.find(line => line.startsWith('Target Audience:'));
            const targetAudience = targetAudienceLine ? targetAudienceLine.replace('Target Audience:', '').trim() : '';
            const businessGoalsLine = lines.find(line => line.startsWith('Business Goals:'));
            const businessGoals = businessGoalsLine ? 
                businessGoalsLine.replace('Business Goals:', '').split(',').map(goal => goal.trim()).filter(goal => goal) : 
                [''];
            const keyAreasLine = lines.find(line => line.startsWith('Key Question Areas:'));
            const keyQuestionAreas = keyAreasLine ? 
                keyAreasLine.replace('Key Question Areas:', '').split(',').map(area => area.trim()).filter(area => area) : 
                [''];
            
            setManifestoForm(prev => ({
                ...prev,
                productVision,
                targetAudience,
                businessGoals: businessGoals.length > 0 ? businessGoals : [''],
                keyQuestionAreas: keyQuestionAreas.length > 0 ? keyQuestionAreas : ['']
            }));
        } else {
            // No manifesto available, show editing mode for manual entry
            setIsEditingManifesto(true);
        }
    }, [schema.manifesto, schema.manifestoData]);

    const updateQuestions = (newQuestions: Question[]) => {
        onSchemaChange({ ...schema, questions: newQuestions });
    }

    const handleIntelligenceToggle = (enabled: boolean) => {
        const aiConfig = enabled ? {
            enabled: true,
            conversationStyle: 'friendly' as const,
            maxDynamicQuestions: 2,
            adaptationLevel: 'medium' as const,
            personalityTraits: ['empathetic', 'curious']
        } : undefined;
        
        const conversationFlow = enabled ? {
            allowSkipping: true,
            showProgress: true,
            enableBranching: true,
            smartTransitions: true
        } : undefined;
        
        onSchemaChange({ 
            ...schema, 
            intelligentFollowUps: enabled,
            aiConfig,
            conversationFlow
        });
        
        setShowDualContext(enabled);
    };

    const handleManifestoUpdate = (manifestoContext: UserManifestoContext) => {
        // Update the basic manifesto field for backward compatibility
        const manifestoText = `${manifestoContext.productVision}\n\nTarget Audience: ${manifestoContext.targetAudience}`;
        onSchemaChange({ 
            ...schema, 
            manifesto: manifestoText
        });
    };

    const handleManifestoChange = (manifesto: string) => {
        setManifestoValue(manifesto);
        setManifestoSaved(false);
    };

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

    const handleManifestoSave = () => {
        // Save both text and structured data
        const manifestoText = `${manifestoForm.productVision}\n\nTarget Audience: ${manifestoForm.targetAudience}`;
        const manifestoData = {
            productVision: manifestoForm.productVision,
            targetAudience: manifestoForm.targetAudience,
            businessGoals: manifestoForm.businessGoals.filter(goal => goal.trim()),
            keyQuestionAreas: manifestoForm.keyQuestionAreas.filter(area => area.trim()),
            conversationTone: manifestoForm.conversationTone
        };
        
        onSchemaChange({ 
            ...schema, 
            manifesto: manifestoText,
            manifestoData: manifestoData
        });
        setIsEditingManifesto(false);
    };

    const handleGenerateAImanifesto = async () => {
        setIsManifestoLoading(true);
        // Call backend AI endpoint to generate a manifesto (mock for now)
        // Replace with actual API call as needed
        const aiManifesto = {
            productVision: "Help small businesses automate their customer support",
            targetAudience: "Business owners with 5-50 employees, currently using email for support",
            businessGoals: ["Reduce support response time", "Increase customer satisfaction"],
            keyQuestionAreas: ["current support process", "pain points", "team size", "volume"],
            conversationTone: "friendly" as const
        };
        setManifestoForm({
            ...manifestoForm,
            ...aiManifesto
        });
        setIsManifestoLoading(false);
    };

    const handleQuestionUpdate = (updatedQuestion: Question) => {
        const newQuestions = schema.questions.map(q => q.id === updatedQuestion.id ? updatedQuestion : q);
        updateQuestions(newQuestions);
    };

    const handleAddQuestion = () => {
        const newQuestion: Question = {
            id: `q-${Date.now()}`,
            type: 'text',
            label: 'New Question',
            required: false,
        };
        updateQuestions([...schema.questions, newQuestion]);
    };

    const handleQuestionDelete = (questionId: string) => {
        const updated = schema.questions.filter(q => q.id !== questionId);
        // Clean up any logic that points to the deleted question
        const cleaned = updated.map(q => {
            if (q.logic) {
                const newLogic = q.logic.filter(l => l.goToQuestionId !== questionId);
                return { ...q, logic: newLogic.length > 0 ? newLogic : undefined };
            }
            return q;
        });
        updateQuestions(cleaned);
    }
    
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Form Builder</CardTitle>
                        <CardDescription>Make changes to the generated form below.</CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-neutral-700">Intelligence</span>
                            <div className="relative">
                                <button
                                    type="button"
                                    onMouseEnter={() => setShowIntelligentInfo(true)}
                                    onMouseLeave={() => setShowIntelligentInfo(false)}
                                    className="text-neutral-400 hover:text-neutral-600 transition-colors"
                                >
                                    <Info className="h-4 w-4" />
                                </button>
                                {showIntelligentInfo && (
                                    <div className="absolute bottom-full right-0 mb-2 z-50 w-screen max-w-sm sm:max-w-md lg:max-w-lg">
                                        <div className="bg-neutral-900 text-white text-sm rounded-lg px-4 py-3 shadow-xl mx-4 sm:mx-0">
                                            <div className="font-medium mb-2">AI-Powered Intelligence</div>
                                            <div className="text-neutral-300 leading-relaxed">
                                                Enable AI to analyze responses and ask intelligent follow-up questions based on your form's manifesto to gather more complete information.
                                            </div>
                                            {/* Arrow */}
                                            <div className="absolute top-full right-6 border-4 border-transparent border-t-neutral-900"></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center space-x-3">
                            <button
                                type="button"
                                role="switch"
                                aria-checked={!!schema.intelligentFollowUps}
                                onClick={() => handleIntelligenceToggle(!schema.intelligentFollowUps)}
                                className={cn(
                                    'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2',
                                    schema.intelligentFollowUps ? 'bg-neutral-900' : 'bg-neutral-300'
                                )}
                            >
                                <span
                                    aria-hidden="true"
                                    className={cn(
                                        'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                                        schema.intelligentFollowUps ? 'translate-x-5' : 'translate-x-0'
                                    )}
                                />
                            </button>
                            <span className="text-xs font-medium text-neutral-700">
                                {schema.intelligentFollowUps ? 'Enabled' : 'Disabled'}
                            </span>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="mb-6">
                    <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-semibold text-gray-900">Product Manifesto</h3>
                                <p className="text-sm text-gray-600">Define your product vision to guide AI question generation. You can edit the AI-generated suggestion or write your own.</p>
                            </div>
                            {!isEditingManifesto && (
                                <Button 
                                    onClick={() => setIsEditingManifesto(true)} 
                                    variant="outline" 
                                    size="sm"
                                    className="ml-4"
                                >
                                    Edit Manifesto
                                </Button>
                            )}
                        </div>
                    </div>
                    {isEditingManifesto ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Product Vision *</label>
                                <Textarea value={manifestoForm.productVision} onChange={e => handleManifestoField('productVision', e.target.value)} placeholder="What is your product's core purpose and vision?" rows={2} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience *</label>
                                <Textarea value={manifestoForm.targetAudience} onChange={e => handleManifestoField('targetAudience', e.target.value)} placeholder="Who are your primary users?" rows={2} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Business Goals</label>
                                {manifestoForm.businessGoals.map((goal, i) => (
                                    <div key={i} className="flex space-x-2 mb-2">
                                        <input type="text" value={goal} onChange={e => handleManifestoArrayField('businessGoals', i, e.target.value)} placeholder="e.g., Increase customer satisfaction" className="flex-1 px-3 py-2 border border-gray-300 rounded-md" />
                                        {manifestoForm.businessGoals.length > 1 && <Button onClick={() => handleManifestoRemoveArrayField('businessGoals', i)} variant="outline" size="sm">×</Button>}
                                    </div>
                                ))}
                                <Button onClick={() => handleManifestoAddArrayField('businessGoals')} variant="outline" size="sm">+ Add Goal</Button>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Key Question Areas</label>
                                {manifestoForm.keyQuestionAreas.map((area, i) => (
                                    <div key={i} className="flex space-x-2 mb-2">
                                        <input type="text" value={area} onChange={e => handleManifestoArrayField('keyQuestionAreas', i, e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-md" />
                                        {manifestoForm.keyQuestionAreas.length > 1 && <Button onClick={() => handleManifestoRemoveArrayField('keyQuestionAreas', i)} variant="outline" size="sm">×</Button>}
                                    </div>
                                ))}
                                <Button onClick={() => handleManifestoAddArrayField('keyQuestionAreas')} variant="outline" size="sm">+ Add Area</Button>
                            </div>
                            <div className="flex space-x-3">
                                <Button onClick={handleManifestoSave} className="bg-blue-600 hover:bg-blue-700">Save Manifesto</Button>
                                <Button onClick={() => setIsEditingManifesto(false)} variant="outline">Cancel</Button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-start space-x-3">
                                <div className="flex-1">
                                    <h4 className="font-medium text-green-900">Manifesto Configured</h4>
                                    <p className="text-sm text-green-700 mt-1"><strong>Vision:</strong> {manifestoForm.productVision}</p>
                                    <p className="text-sm text-green-700"><strong>Audience:</strong> {manifestoForm.targetAudience}</p>
                                    {manifestoForm.businessGoals && manifestoForm.businessGoals.length > 0 && <p className="text-sm text-green-700"><strong>Business Goals:</strong> {manifestoForm.businessGoals.join(', ')}</p>}
                                    {manifestoForm.keyQuestionAreas && manifestoForm.keyQuestionAreas.length > 0 && <p className="text-sm text-green-700"><strong>Key Areas:</strong> {manifestoForm.keyQuestionAreas.join(', ')}</p>}
                                </div>
                                <Button onClick={() => setIsEditingManifesto(true)} variant="outline" size="sm">Edit Manifesto</Button>
                            </div>
                        </div>
                    )}
                </div>
                <div className="space-y-4">
                    {schema.questions.map((question) => (
                        <QuestionEditorCard
                            key={question.id}
                            question={question}
                            allQuestions={schema.questions}
                            onUpdate={handleQuestionUpdate}
                            onDelete={handleQuestionDelete}
                            isWelcome={question.type === 'welcome'}
                        />
                    ))}
                </div>
                
                <div className="mt-6 border-t pt-6">
                    <Button variant="outline" onClick={handleAddQuestion}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Question
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default FormEditor;
