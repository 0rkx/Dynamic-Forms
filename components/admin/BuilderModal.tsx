import React, { useState, useEffect } from 'react';
import { FormSchema, Question } from '../../types';
import { useFormStore } from '../../store/formStore';
import { Button } from '../ui/Button';
import { QuestionEditorCard } from './QuestionEditorCard';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { PlusCircle, X, AlertTriangle } from 'lucide-react';

interface BuilderModalProps {
    form: FormSchema;
    editedQuestions: Question[];
    onClose: () => void;
    onQuestionsChange: (questions: Question[]) => void;
}

const BuilderModal: React.FC<BuilderModalProps> = ({ form, editedQuestions, onClose, onQuestionsChange }) => {
    const [localQuestions, setLocalQuestions] = useState<Question[]>(editedQuestions);
    const [isDirty, setIsDirty] = useState(false);
    
    const { updateForm, invalidateAnalysis, analyzeFormInBackground } = useFormStore();
    
    // Prevent body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);
    
    // Update local questions when prop changes (e.g., from autofix)
    useEffect(() => {
        setLocalQuestions(editedQuestions);
        setIsDirty(JSON.stringify(form.questions) !== JSON.stringify(editedQuestions));
    }, [editedQuestions, form.questions]);

    // Check if current local questions are dirty
    useEffect(() => {
        setIsDirty(JSON.stringify(form.questions) !== JSON.stringify(localQuestions));
    }, [localQuestions, form.questions]);
    
    // Sync changes back to parent when local questions change
    useEffect(() => {
        if (JSON.stringify(editedQuestions) !== JSON.stringify(localQuestions)) {
            onQuestionsChange(localQuestions);
        }
    }, [localQuestions, editedQuestions, onQuestionsChange]);

    const handleQuestionUpdate = (updatedQuestion: Question) => {
        setLocalQuestions(prev => prev.map(q => q.id === updatedQuestion.id ? updatedQuestion : q));
    };

    const handleAddQuestion = () => {
        const newQuestion: Question = {
            id: `q-${Date.now()}`,
            type: 'text',
            label: 'New Question',
            required: false,
        };
        setLocalQuestions(prev => [...prev, newQuestion]);
    };

    const handleQuestionDelete = (questionId: string) => {
        const updated = localQuestions.filter(q => q.id !== questionId);
        const cleaned = updated.map(q => {
            if (q.logic) {
                const newLogic = q.logic.filter(l => l.goToQuestionId !== questionId);
                return { ...q, logic: newLogic.length > 0 ? newLogic : undefined };
            }
            return q;
        });
        setLocalQuestions(cleaned);
    };
    
    const handleSaveChanges = () => {
        updateForm(form.id, { questions: localQuestions });
        setIsDirty(false);
        
        // Trigger immediate re-analysis after save
        setTimeout(() => {
            invalidateAnalysis(form.id);
            const updatedForm = { ...form, questions: localQuestions };
            analyzeFormInBackground(updatedForm);
        }, 100);
    };

    const handleSaveAndClose = () => {
        if (isDirty) {
            handleSaveChanges();
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-8 animate-in fade-in-0">
            <div className="w-full max-w-5xl max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden relative animate-in zoom-in-95">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-neutral-900">Form Builder</h2>
                        <p className="text-sm text-neutral-600 mt-1">Edit your form questions and settings</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button 
                            onClick={handleSaveChanges} 
                            disabled={!isDirty} 
                            size="sm"
                            className={isDirty ? "bg-blue-600 hover:bg-blue-700" : ""}
                        >
                            {isDirty ? 'Save Changes' : 'Saved'}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={onClose} className="text-neutral-400 hover:text-neutral-600">
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                {/* Warning banner */}
                {isDirty && (
                    <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <h3 className="font-medium text-amber-800">Unsaved Changes</h3>
                                <p className="text-sm text-amber-700">You have unsaved changes that will affect the live form.</p>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 140px)' }}>
                    <div className="space-y-6">
                        {localQuestions.map((question, index) => (
                            <div key={question.id} className="relative">
                                <div className="absolute left-0 top-4 w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center text-sm font-medium text-neutral-600">
                                    {index + 1}
                                </div>
                                <div className="ml-12">
                                    <QuestionEditorCard
                                        question={question}
                                        allQuestions={localQuestions}
                                        onUpdate={handleQuestionUpdate}
                                        onDelete={handleQuestionDelete}
                                        isWelcome={question.type === 'welcome'}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="mt-8 pt-6 border-t border-neutral-200">
                        <Button 
                            variant="outline" 
                            onClick={handleAddQuestion}
                            className="w-full py-3 border-dashed border-2 hover:bg-neutral-50"
                        >
                            <PlusCircle className="mr-2 h-5 w-5" />
                            Add New Question
                        </Button>
                    </div>
                </div>
                
                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t bg-neutral-50 sticky bottom-0">
                    <div className="text-sm text-neutral-600">
                        {localQuestions.length} question{localQuestions.length !== 1 ? 's' : ''} • 
                        {isDirty ? ' Unsaved changes' : ' All changes saved'}
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleSaveAndClose}
                            className="bg-neutral-900 hover:bg-neutral-800"
                        >
                            {isDirty ? 'Save & Close' : 'Done'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BuilderModal; 