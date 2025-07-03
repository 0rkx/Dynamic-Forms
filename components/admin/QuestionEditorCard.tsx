import React, { useState } from 'react';
import { Question, QuestionOption, QuestionType, QuestionLogic } from '../../types';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Trash2, ChevronDown, GripVertical, Plus, X, GitFork } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useConfigStore } from '../../store/configStore';


interface QuestionEditorCardProps {
    question: Question;
    allQuestions: Question[];
    onUpdate: (question: Question) => void;
    onDelete: (questionId: string) => void;
    isWelcome?: boolean;
}

export const QuestionEditorCard: React.FC<QuestionEditorCardProps> = ({ question, allQuestions, onUpdate, onDelete, isWelcome }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { questionTypes } = useConfigStore();
    
    const handleFieldChange = (field: keyof Question, value: any) => {
        onUpdate({ ...question, [field]: value });
    };

    const handleOptionChange = (index: number, field: keyof QuestionOption, value: string) => {
        const newOptions = [...(question.options || [])];
        newOptions[index] = { ...newOptions[index], [field]: value };
        handleFieldChange('options', newOptions);
    };
    
    const addOption = () => {
        const newOption = { label: '', value: '' };
        const newOptions = [...(question.options || []), newOption];
        handleFieldChange('options', newOptions);
    };

    const removeOption = (index: number) => {
        const newOptions = (question.options || []).filter((_, i) => i !== index);
        handleFieldChange('options', newOptions);
    }
    
    const handleLogicChange = (index: number, field: keyof QuestionLogic, value: string) => {
        const newLogic = [...(question.logic || [])];
        newLogic[index] = { ...newLogic[index], [field]: value };
        handleFieldChange('logic', newLogic);
    };

    const addLogicRule = () => {
        const newRule = { onValue: '', goToQuestionId: '' };
        handleFieldChange('logic', [...(question.logic || []), newRule]);
    };
    
    const removeLogicRule = (index: number) => {
        const newLogic = (question.logic || []).filter((_, i) => i !== index);
        handleFieldChange('logic', newLogic.length > 0 ? newLogic : undefined);
    };

    return (
        <Card className={cn(isWelcome && "bg-neutral-50 border-dashed")}>
            <CardHeader 
                className="flex flex-row items-center justify-between cursor-pointer p-3 sm:p-4"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2 sm:gap-3 truncate min-w-0 flex-1">
                    <GripVertical className="h-4 w-4 sm:h-5 sm:w-5 text-neutral-400 flex-shrink-0" />
                    <span className="font-semibold truncate text-sm sm:text-base" title={question.label}>{question.label}</span>
                    <span className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded-full flex-shrink-0 hidden sm:inline">{question.type}</span>
                    {question.logic && question.logic.length > 0 && (
                        <span title="Has conditional logic">
                            <GitFork className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0" />
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <span className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded-full sm:hidden">{question.type}</span>
                    {!isWelcome && (
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(question.id); }} className="h-8 w-8 sm:h-10 sm:w-10">
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                    )}
                    <ChevronDown className={cn("h-4 w-4 sm:h-5 sm:w-5 transition-transform", isOpen && "rotate-180")} />
                </div>
            </CardHeader>
            {isOpen && (
                <CardContent className="p-3 sm:p-4 pt-0 border-t space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="lg:col-span-2">
                            <label className="text-sm font-medium block mb-1">Question Label</label>
                            <Input
                                value={question.label}
                                onChange={e => handleFieldChange('label', e.target.value)}
                                className="w-full"
                            />
                        </div>

                        <div className="w-full">
                            <label className="text-sm font-medium block mb-1">Question Type</label>
                            <Select 
                                value={question.type}
                                onChange={e => handleFieldChange('type', e.target.value as QuestionType)}
                                disabled={isWelcome}
                                className="w-full"
                            >
                                {questionTypes.filter(t => t !== 'welcome').map(type => <option key={type} value={type}>{type}</option>)}
                            </Select>
                        </div>
                        
                        <div className="flex items-end w-full">
                            <div className="flex items-center gap-2 h-10">
                                <input
                                    type="checkbox"
                                    id={`required-${question.id}`}
                                    checked={!!question.required}
                                    onChange={e => handleFieldChange('required', e.target.checked)}
                                    className="h-4 w-4 rounded border-neutral-300"
                                    disabled={isWelcome}
                                />
                                <label htmlFor={`required-${question.id}`} className="text-sm font-medium select-none">Required</label>
                            </div>
                        </div>

                        <div className="lg:col-span-2">
                            <label className="text-sm font-medium block mb-1">Description (optional)</label>
                            <Textarea
                                value={question.description || ''}
                                onChange={e => handleFieldChange('description', e.target.value)}
                                className="w-full"
                            />
                        </div>
                    </div>

                    {(question.type === 'multiple-choice' || question.type === 'quick-select' || question.type === 'mood' || question.type === 'budget-range') && (
                         <div className="border-t pt-4">
                            <label className="text-sm font-medium block mb-1">
                                {question.type === 'mood' ? 'Mood Options (emoji)' : 
                                 question.type === 'budget-range' ? 'Budget Ranges' : 'Options'}
                            </label>
                            <div className="space-y-2 mt-1">
                                {(question.options || []).map((opt, index) => (
                                    <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                        <Input 
                                            placeholder={question.type === 'mood' ? "😊" : "Label (for display)"} 
                                            value={opt.label} 
                                            onChange={e => handleOptionChange(index, 'label', e.target.value)} 
                                            className="flex-1" 
                                        />
                                        <Input 
                                            placeholder={question.type === 'mood' ? "happy" : "Value (for logic)"} 
                                            value={opt.value} 
                                            onChange={e => handleOptionChange(index, 'value', e.target.value)} 
                                            className="flex-1" 
                                        />
                                        <Button variant="ghost" size="icon" onClick={() => removeOption(index)} className="self-end sm:self-center flex-shrink-0">
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                <Button variant="outline" size="sm" onClick={addOption} className="w-full sm:w-auto">
                                    <Plus className="h-4 w-4 mr-2"/> Add Option
                                </Button>
                            </div>
                         </div>
                    )}
                    
                    {(question.type === 'rating' || question.type === 'slider') && (
                        <div className="border-t pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <div>
                                <label className="text-sm font-medium block mb-1">Min Rating</label>
                                <Input type="number" value={question.min || 1} onChange={e => handleFieldChange('min', parseInt(e.target.value, 10) || 1)} className="w-full" />
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1">Max Rating</label>
                                <Input type="number" value={question.max || 5} onChange={e => handleFieldChange('max', parseInt(e.target.value, 10) || 5)} className="w-full" />
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1">Min Label (optional)</label>
                                <Input value={question.minLabel || ''} onChange={e => handleFieldChange('minLabel', e.target.value)} className="w-full" />
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1">Max Label (optional)</label>
                                <Input value={question.maxLabel || ''} onChange={e => handleFieldChange('maxLabel', e.target.value)} className="w-full" />
                            </div>
                        </div>
                    )}
                    
                    {!isWelcome && ['multiple-choice', 'rating', 'quick-select', 'mood', 'budget-range', 'slider'].includes(question.type) && (
                        <div className="border-t pt-4">
                            <label className="text-sm font-medium">Conditional Logic</label>
                            <p className="text-xs text-neutral-500 mb-2">Branch to a different question based on the user's answer.</p>
                            <div className="space-y-2">
                                {(question.logic || []).map((logic, index) => (
                                    <div key={index} className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 p-2 bg-neutral-50 rounded-md">
                                        <span className="text-sm whitespace-nowrap">If answer is</span>
                                        {question.type === 'multiple-choice' ? (
                                            <Select 
                                                value={logic.onValue} 
                                                onChange={e => handleLogicChange(index, 'onValue', e.target.value)}
                                                className="w-full sm:w-auto sm:flex-1 sm:min-w-0"
                                            >
                                                <option value="">Select an option...</option>
                                                {question.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                            </Select>
                                        ) : (
                                            <Input
                                                type="number"
                                                className="w-full sm:w-24"
                                                placeholder="e.g. 1"
                                                value={logic.onValue}
                                                onChange={e => handleLogicChange(index, 'onValue', e.target.value)}
                                            />
                                        )}
                                        <span className="text-sm whitespace-nowrap">go to</span>
                                        <Select
                                            className="w-full sm:w-auto sm:flex-1 sm:min-w-0"
                                            value={logic.goToQuestionId}
                                            onChange={e => handleLogicChange(index, 'goToQuestionId', e.target.value)}
                                        >
                                            <option value="">Select question...</option>
                                            {allQuestions.filter(q => q.id !== question.id).map(q => <option key={q.id} value={q.id}>{q.label}</option>)}
                                        </Select>
                                        <Button variant="ghost" size="icon" onClick={() => removeLogicRule(index)} className="ml-auto"><X className="h-4 w-4" /></Button>
                                    </div>
                                ))}
                                <Button variant="outline" size="sm" onClick={addLogicRule}><Plus className="h-4 w-4 mr-2" /> Add Rule</Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    )
}