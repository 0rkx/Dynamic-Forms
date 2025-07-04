import React, { useState, useEffect } from 'react';
import { FormSchema, Question } from '../../types';
import { useFormStore } from '../../store/formStore';
import { Button } from '../ui/Button';
import { QuestionEditorCard } from './QuestionEditorCard';
import { PlusCircle, AlertTriangle } from 'lucide-react';

interface BuilderTabProps {
    form: FormSchema;
}

const BuilderTab: React.FC<BuilderTabProps> = ({ form }) => {
    const [editedQuestions, setEditedQuestions] = useState<Question[]>(form.questions);
    const [isDirty, setIsDirty] = useState(false);

    const { updateForm, invalidateAnalysis, analyzeFormInBackground } = useFormStore();

    useEffect(() => {
        setEditedQuestions(form.questions);
        setIsDirty(false);
    }, [form]);

    useEffect(() => {
        setIsDirty(JSON.stringify(form.questions) !== JSON.stringify(editedQuestions));
    }, [editedQuestions, form.questions]);

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
    };

    const handleSaveChanges = () => {
        updateForm(form.id, { questions: editedQuestions });
        setIsDirty(false);

        // Re-run analysis in the background so other tabs stay up-to-date
        setTimeout(() => {
            invalidateAnalysis(form.id);
            analyzeFormInBackground({ ...form, questions: editedQuestions });
        }, 100);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-neutral-900">Form Builder</h2>
                <Button
                    onClick={handleSaveChanges}
                    disabled={!isDirty}
                    className={isDirty ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
                >
                    {isDirty ? 'Save Changes' : 'Saved'}
                </Button>
            </div>

            {/* Unsaved banner */}
            {isDirty && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                        <h3 className="font-medium text-amber-800">Unsaved Changes</h3>
                        <p className="text-sm text-amber-700">You have unsaved changes that will affect the live form.</p>
                    </div>
                </div>
            )}

            {/* Questions */}
            <div className="space-y-6">
                {editedQuestions.map((question, index) => (
                    <div key={question.id} className="relative">
                        <div className="absolute left-0 top-4 w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center text-sm font-medium text-neutral-600">
                            {index + 1}
                        </div>
                        <div className="ml-12">
                            <QuestionEditorCard
                                question={question}
                                allQuestions={editedQuestions}
                                onUpdate={handleQuestionUpdate}
                                onDelete={handleQuestionDelete}
                                isWelcome={question.type === 'welcome'}
                            />
                        </div>
                    </div>
                ))}

                {/* Add question */}
                <div className="pt-6 border-t border-neutral-200">
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
        </div>
    );
};

export default BuilderTab;