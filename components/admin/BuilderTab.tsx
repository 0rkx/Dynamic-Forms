import React, { useState, useEffect, useMemo } from 'react';
import { FormSchema, Question, FormAnalysis } from '../../types';
import { useFormStore } from '../../store/formStore';
import { Button } from '../ui/Button';
import { QuestionEditorCard } from './QuestionEditorCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { PlusCircle, AlertTriangle, Lightbulb, CheckCircle, Wand2, Edit3 } from 'lucide-react';
import BuilderModal from './BuilderModal';

interface BuilderTabProps {
    form: FormSchema;
}

const BuilderTab: React.FC<BuilderTabProps> = ({ form }) => {
    const [editedQuestions, setEditedQuestions] = useState<Question[]>(form.questions);
    const [isDirty, setIsDirty] = useState(false);
    const [appliedRecommendations, setAppliedRecommendations] = useState<Set<number>>(new Set());
    const [showBuilderModal, setShowBuilderModal] = useState(false);
    
    const { 
        updateForm, 
        getAnalysis, 
        isAnalyzing, 
        analyzeFormInBackground,
        invalidateAnalysis 
    } = useFormStore();
    
    // Get current analysis from store
    const aiAnalysis = getAnalysis(form.id);
    const isCurrentlyAnalyzing = isAnalyzing(form.id);
    
    // Hash of current questions for change detection
    const questionsHash = useMemo(() => {
        return JSON.stringify(editedQuestions.map(q => ({
            id: q.id,
            type: q.type,
            label: q.label,
            options: q.options,
            required: q.required,
            logic: q.logic
        })));
    }, [editedQuestions]);
    
    useEffect(() => {
        setEditedQuestions(form.questions);
        setIsDirty(false);
    }, [form]);

    useEffect(() => {
        setIsDirty(JSON.stringify(form.questions) !== JSON.stringify(editedQuestions));
    }, [editedQuestions, form.questions]);
    
    // Sync editedQuestions when form is updated from store
    useEffect(() => {
        if (JSON.stringify(form.questions) !== JSON.stringify(editedQuestions)) {
            setEditedQuestions(form.questions);
        }
    }, [form.questions]);

    // Auto-analyze when component mounts (background)
    useEffect(() => {
        analyzeFormInBackground(form);
    }, [form.id]); // Only re-run if form ID changes
    
    // Auto-analyze when questions change (with debounce)
    useEffect(() => {
        if (!isDirty) return; // Only analyze if there are changes
        
        const timeoutId = setTimeout(() => {
            // Invalidate old analysis and trigger new one
            invalidateAnalysis(form.id);
            
            // Create temporary form with edited questions for analysis
            const tempForm = { ...form, questions: editedQuestions };
            analyzeFormInBackground(tempForm);
        }, 2000); // 2 second debounce
        
        return () => clearTimeout(timeoutId);
    }, [questionsHash, isDirty, form.id, editedQuestions, form]);

    const handleQuestionUpdate = (updatedQuestion: Question) => {
        setEditedQuestions(prev => prev.map(q => q.id === updatedQuestion.id ? updatedQuestion : q));
    };

    const handleAddQuestion = () => {
        const newQuestion: Question = {
            id: `q-${Date.now()}`,
            type: 'text',
            label: 'New Question',
            required: false,
        };
        setEditedQuestions(prev => [...prev, newQuestion]);
    };

    const handleQuestionDelete = (questionId: string) => {
        const updated = editedQuestions.filter(q => q.id !== questionId);
        const cleaned = updated.map(q => {
            if (q.logic) {
                const newLogic = q.logic.filter(l => l.goToQuestionId !== questionId);
                return { ...q, logic: newLogic.length > 0 ? newLogic : undefined };
            }
            return q;
        });
        setEditedQuestions(cleaned);
    }
    
    const handleSaveChanges = () => {
        updateForm(form.id, { questions: editedQuestions });
        setIsDirty(false);
        
        // Trigger immediate re-analysis after save
        setTimeout(() => {
            invalidateAnalysis(form.id);
            const updatedForm = { ...form, questions: editedQuestions };
            analyzeFormInBackground(updatedForm);
        }, 100);
    };

    const getInsightIcon = (type: string) => {
        switch (type) {
            case 'positive': return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
            case 'suggestion': return <Lightbulb className="h-4 w-4 text-blue-500" />;
            default: return <Lightbulb className="h-4 w-4 text-neutral-500" />;
        }
    };

    const handleAutoApply = async (recommendationIndex: number, recommendation: any) => {
        let updatedQuestions = [...editedQuestions];
        let changesMade = false;
        
        // Simple auto-apply logic for common recommendations
        const action = recommendation.action.toLowerCase();
        console.log('Applying recommendation:', action, recommendation);
        
        // Make question q7 optional
        if (action.includes('make question q7') && action.includes('optional')) {
            const q7 = updatedQuestions.find(q => q.label?.toLowerCase().includes('other comments') || q.label?.toLowerCase().includes('suggestions'));
            if (q7) {
                updatedQuestions = updatedQuestions.map(q => 
                    q.id === q7.id ? { ...q, required: false } : q
                );
                changesMade = true;
                console.log('Made q7 optional');
            }
        }
        
        // Make question q4 optional and consider changing phrasing
        if (action.includes('make question q4') && action.includes('optional')) {
            const q4 = updatedQuestions.find(q => q.label?.toLowerCase().includes('tell us what else you enjoyed'));
            if (q4) {
                updatedQuestions = updatedQuestions.map(q => 
                    q.id === q4.id ? { ...q, required: false } : q
                );
                changesMade = true;
                console.log('Made q4 optional');
            }
        }
        
        // Remove logic branching between q3 and q4
        if (action.includes('remove logic branching') && action.includes('q3') && action.includes('q4')) {
            updatedQuestions = updatedQuestions.map(q => {
                if (q.logic) {
                    const newLogic = q.logic.filter(l => !l.goToQuestionId?.includes('q4'));
                    return { ...q, logic: newLogic.length > 0 ? newLogic : undefined };
                }
                return q;
            });
            changesMade = true;
            console.log('Removed logic branching');
        }
        
        // Consider using 1-10 rating scale for q5
        if (action.includes('1-10 rating scale') && action.includes('q5')) {
            const q5 = updatedQuestions.find(q => q.label?.toLowerCase().includes('likely') && q.label?.toLowerCase().includes('recommend'));
            if (q5 && q5.type === 'multiple-choice') {
                const ratingOptions: { value: string; label: string }[] = [];
                for (let i = 1; i <= 10; i++) {
                    ratingOptions.push({ value: i.toString(), label: i.toString() });
                }
                updatedQuestions = updatedQuestions.map(q => 
                    q.id === q5.id ? { ...q, options: ratingOptions } : q
                );
                changesMade = true;
                console.log('Updated q5 to 1-10 scale');
            }
        }
        
        // Generic fallbacks for common patterns
        if (!changesMade) {
            if (action.includes('add welcome') || action.includes('welcome question')) {
                const hasWelcome = updatedQuestions.some(q => q.type === 'welcome');
                if (!hasWelcome) {
                    const welcomeQuestion: Question = {
                        id: 'welcome',
                        type: 'welcome',
                        label: 'Welcome!',
                        description: 'Thank you for taking the time to complete this form.',
                        required: false,
                    };
                    updatedQuestions = [welcomeQuestion, ...updatedQuestions];
                    changesMade = true;
                }
            }
            
            if (action.includes('multiple choice') || action.includes('multiple-choice')) {
                const firstTextQuestion = updatedQuestions.find(q => q.type === 'text');
                if (firstTextQuestion) {
                    const updatedQuestion: Question = {
                        ...firstTextQuestion,
                        type: 'multiple-choice',
                        options: [
                            { value: 'option1', label: 'Option 1' },
                            { value: 'option2', label: 'Option 2' },
                            { value: 'other', label: 'Other' }
                        ]
                    };
                    updatedQuestions = updatedQuestions.map(q => q.id === firstTextQuestion.id ? updatedQuestion : q);
                    changesMade = true;
                }
            }
            
            if (action.includes('required') && action.includes('question')) {
                updatedQuestions = updatedQuestions.map(q => 
                    q.type !== 'welcome' ? { ...q, required: true } : q
                );
                changesMade = true;
            }
            
            if (action.includes('optional') && action.includes('question')) {
                updatedQuestions = updatedQuestions.map(q => 
                    q.type !== 'welcome' ? { ...q, required: false } : q
                );
                changesMade = true;
            }
        }
        
        console.log('Changes made:', changesMade, 'Updated questions:', updatedQuestions);
        
        // Apply changes and open modal for review
        if (changesMade) {
            setEditedQuestions(updatedQuestions);
            // Mark as applied after changes are made
            setAppliedRecommendations(prev => new Set([...prev, recommendationIndex]));
            // Open the builder modal so user can review and save the changes
            setShowBuilderModal(true);
        } else {
            // If no changes could be applied, still mark as applied but don't open modal
            setAppliedRecommendations(prev => new Set([...prev, recommendationIndex]));
            console.log('No applicable changes found for:', action);
        }
    };

    return (
        <div>

            {/* AI Insights Section */}
            {aiAnalysis && !isCurrentlyAnalyzing && (
                <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                        <Wand2 className="h-6 w-6" />
                        Insights
                    </h2>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Form Score */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Form Quality Score</CardTitle>
                                <CardDescription>AI analysis of your form's effectiveness</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-4">
                                    <div className="text-4xl font-bold">{aiAnalysis.overall_score}/100</div>
                                    <div className="flex-1">
                                        <div className="w-full bg-neutral-200 rounded-full h-2">
                                            <div 
                                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                                style={{ width: `${aiAnalysis.overall_score}%` }}
                                            ></div>
                                        </div>
                                        <p className="text-sm text-neutral-500 mt-1">
                                            {aiAnalysis.overall_score >= 80 ? 'Excellent' : 
                                             aiAnalysis.overall_score >= 60 ? 'Good' : 
                                             aiAnalysis.overall_score >= 40 ? 'Fair' : 'Needs Improvement'}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-6 pt-4 border-t border-neutral-200">
                                    <Button 
                                        onClick={() => setShowBuilderModal(true)}
                                        className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-medium py-3"
                                        size="lg"
                                    >
                                        <Edit3 className="mr-2 h-4 w-4" />
                                        Launch Builder
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Form Health & Status */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Form Health & Status</CardTitle>
                                <CardDescription>Key metrics and readiness indicators</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {/* Form Readiness */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-neutral-600">Form Readiness:</span>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${
                                                aiAnalysis.overall_score >= 70 ? 'bg-green-500' :
                                                aiAnalysis.overall_score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                            }`}></div>
                                            <span className="font-medium text-sm">
                                                {aiAnalysis.overall_score >= 70 ? 'Ready to Launch' :
                                                 aiAnalysis.overall_score >= 50 ? 'Needs Improvement' : 'Requires Fixes'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Estimated Completion Time */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-neutral-600">Est. Completion Time:</span>
                                        <span className="font-medium text-sm">
                                            {Math.max(1, Math.ceil(editedQuestions.filter(q => q.type !== 'welcome').length * 0.5))} - {Math.ceil(editedQuestions.filter(q => q.type !== 'welcome').length * 1.2)} min
                                        </span>
                                    </div>

                                    {/* Form Type */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-neutral-600">Form Type:</span>
                                        <span className="font-medium text-sm">
                                            {editedQuestions.length <= 3 ? 'Quick Survey' :
                                             editedQuestions.length <= 7 ? 'Standard Form' : 'Detailed Survey'}
                                        </span>
                                    </div>

                                    {/* Critical Issues */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-neutral-600">Critical Issues:</span>
                                        <span className={`font-medium text-sm ${
                                            aiAnalysis.recommendations.filter(r => r.priority === 'high').length === 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                            {aiAnalysis.recommendations.filter(r => r.priority === 'high').length === 0 ? 'None' : 
                                             aiAnalysis.recommendations.filter(r => r.priority === 'high').length}
                                        </span>
                                    </div>

                                    {/* User Experience Score */}
                                    <div className="pt-2 border-t">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm text-neutral-600">User Experience:</span>
                                            <span className="font-medium text-sm">
                                                {aiAnalysis.overall_score >= 80 ? 'Excellent' :
                                                 aiAnalysis.overall_score >= 60 ? 'Good' :
                                                 aiAnalysis.overall_score >= 40 ? 'Fair' : 'Poor'}
                                            </span>
                                        </div>
                                        <div className="text-xs text-neutral-500">
                                            {aiAnalysis.insights.filter(i => i.type === 'positive').length > 0 ? 
                                             `${aiAnalysis.insights.filter(i => i.type === 'positive').length} strengths identified` :
                                             'Focus on implementing recommendations'}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Show recommendations only if form needs improvement */}
                    {aiAnalysis.overall_score < 80 && aiAnalysis.recommendations.length > 0 ? (
                        <Card className="mb-6">
                            <CardHeader>
                                <CardTitle>Issues to Fix</CardTitle>
                                <CardDescription>Click "Auto Apply" to automatically implement these fixes</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {aiAnalysis.recommendations.map((rec, index) => (
                                        <div key={index} className="border-l-4 border-red-200 pl-4 bg-red-50 p-4 rounded-r-lg">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className={`text-xs px-2 py-1 rounded-full ${
                                                            rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                                                            rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-green-100 text-green-700'
                                                        }`}>
                                                            {rec.priority}
                                                        </span>
                                                        <h4 className="font-medium text-sm">{rec.action}</h4>
                                                    </div>
                                                    <p className="text-sm text-neutral-600">{rec.reason}</p>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant={appliedRecommendations.has(index) ? "outline" : "default"}
                                                    onClick={() => handleAutoApply(index, rec)}
                                                    disabled={appliedRecommendations.has(index)}
                                                    className="shrink-0"
                                                >
                                                    {appliedRecommendations.has(index) ? (
                                                        <>
                                                            <CheckCircle className="h-3 w-3 mr-1" />
                                                            Fixed
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Wand2 className="h-3 w-3 mr-1" />
                                                            Auto Fix
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ) : aiAnalysis.overall_score >= 80 ? (
                        // Form is optimized - show success state
                        <Card className="mb-6">
                            <CardContent className="pt-6">
                                <div className="text-center py-8">
                                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-green-800 mb-2">Form is Optimized!</h3>
                                    <p className="text-sm text-green-600 max-w-md mx-auto">
                                        Your form scores {aiAnalysis.overall_score}/100. No improvements needed - it's ready to launch!
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : null}


                </div>
            )}

            {isCurrentlyAnalyzing && (
                <div className="mb-8 p-6 border border-neutral-200 rounded-lg">
                    <div className="flex items-center gap-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-neutral-900"></div>
                        <p className="text-neutral-600">
                            {isDirty ? 'Re-analyzing form changes...' : 'Analyzing your form and generating insights...'}
                        </p>
                    </div>
                </div>
            )}

            {/* Builder Modal */}
            {showBuilderModal && (
                <BuilderModal 
                    form={form}
                    editedQuestions={editedQuestions}
                    onClose={() => setShowBuilderModal(false)}
                    onQuestionsChange={setEditedQuestions}
                />
            )}
        </div>
    );
}

export default BuilderTab;