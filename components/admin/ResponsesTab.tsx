import React, { useState } from 'react';
import { FormSchema, FormResponse } from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { exportToCsv, exportToJson, exportToGoogleSheets } from '../../lib/export';
import { User, Calendar, MessageSquare, Hash, Eye, FileSpreadsheet, ExternalLink } from 'lucide-react';
import { useToast } from '../ui/Toast';

interface ResponsesTabProps {
    form: FormSchema;
    responses: FormResponse[];
    onRefresh?: () => void;
}

const ResponsesTab: React.FC<ResponsesTabProps> = ({ form, responses, onRefresh }) => {
    const [selectedResponse, setSelectedResponse] = useState<FormResponse | null>(null);
    const [isExportingToSheets, setIsExportingToSheets] = useState(false);
    const [sheetsExportSuccess, setSheetsExportSuccess] = useState<string | null>(null);
    const { addToast } = useToast();
    
    const handleExportCsv = () => {
        exportToCsv(responses, form.questions, `${form.title}-responses`);
    };

    const handleExportJson = () => {
        exportToJson(responses, `${form.title}-responses`);
    };

    const handleExportToGoogleSheets = async () => {
        if (!import.meta.env.VITE_GOOGLE_CLIENT_ID || !import.meta.env.VITE_GOOGLE_API_KEY) {
            addToast({
                type: 'warning',
                title: 'Google Sheets Not Configured',
                message: 'Google Sheets integration is not configured. Please contact your administrator.',
                duration: 6000
            });
            return;
        }

        setIsExportingToSheets(true);
        setSheetsExportSuccess(null);
        
        try {
            const spreadsheetUrl = await exportToGoogleSheets(
                responses, 
                form.questions, 
                `${form.title} - Responses`
            );
            setSheetsExportSuccess(spreadsheetUrl);
            addToast({
                type: 'success',
                title: 'Export Successful',
                message: 'Responses have been exported to Google Sheets successfully.',
                duration: 5000
            });
        } catch (error: any) {
            console.error('Google Sheets export error:', error);
            addToast({
                type: 'error',
                title: 'Export Failed',
                message: error.message || 'Failed to export to Google Sheets. Please try again.',
                duration: 6000
            });
        } finally {
            setIsExportingToSheets(false);
        }
    };

    const getQuestionLabel = (questionId: string) => {
        const question = form.questions.find(q => q.id === questionId);
        if (question) {
            return question.label;
        }
        
        // Handle followup questions (they have IDs like "questionId_followup_1_timestamp")
        if (questionId.includes('_followup_')) {
            const parts = questionId.split('_followup_');
            const originalQuestionId = parts[0];
            const originalQuestion = form.questions.find(q => q.id === originalQuestionId);
            const followupNumber = parts[1]?.split('_')[0] || '1';
            
            if (originalQuestion) {
                return `${originalQuestion.label} (Follow-up #${followupNumber})`;
            }
            return `Follow-up Question #${followupNumber}`;
        }
        
        return questionId;
    };

    const formatAnswer = (answer: any) => {
        if (typeof answer === 'object' && answer !== null) {
            return JSON.stringify(answer, null, 2);
        }
        return String(answer || '');
    };

    const viewResponseDetails = (response: FormResponse) => {
        setSelectedResponse(response);
    };

    const closeModal = () => {
        setSelectedResponse(null);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-neutral-900">{responses.length} responses</h2>
                <div className="flex gap-2 items-center">
                    {onRefresh && (
                        <Button variant="outline" onClick={onRefresh} className="text-sm">
                            Refresh
                        </Button>
                    )}
                    <Button variant="outline" onClick={handleExportCsv} disabled={responses.length === 0}>
                        Export CSV
                    </Button>
                    <Button variant="outline" onClick={handleExportJson} disabled={responses.length === 0}>
                        Export JSON
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={handleExportToGoogleSheets} 
                        disabled={responses.length === 0 || isExportingToSheets}
                        className="flex items-center gap-2"
                    >
                        <FileSpreadsheet className="h-4 w-4" />
                        {isExportingToSheets ? 'Exporting...' : 'Export to Sheets'}
                    </Button>
                </div>
            </div>
            
            {/* Success message for Google Sheets export */}
            {sheetsExportSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="h-5 w-5 bg-green-500 rounded-full flex items-center justify-center">
                                <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <span className="text-green-800 font-medium">Successfully exported to Google Sheets!</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                onClick={() => window.open(sheetsExportSuccess, '_blank')}
                                className="flex items-center gap-1 text-green-700 hover:text-green-800"
                                variant="ghost"
                            >
                                <ExternalLink className="h-4 w-4" />
                                Open Spreadsheet
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSheetsExportSuccess(null)}
                                className="text-green-700 hover:text-green-800"
                            >
                                ×
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {responses.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-neutral-200 rounded-lg">
                    <User className="h-16 w-16 text-neutral-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-semibold">No Responses Yet</h2>
                    <p className="text-neutral-500 mt-2">Share your form to start collecting responses.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {responses.map((response) => {
                        const answeredQuestions = Object.keys(response.answers).length;
                        
                        return (
                            <Card 
                                key={response.id} 
                                className="border-neutral-200 hover:shadow-md transition-shadow"
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Hash className="h-4 w-4 text-neutral-400" />
                                            {response.id.slice(-8)}
                                        </CardTitle>
                                        <Button 
                                            variant="ghost" 
                                            size="sm"
                                            onClick={() => viewResponseDetails(response)}
                                            className="text-neutral-500 hover:text-neutral-700 flex items-center gap-1"
                                        >
                                            <Eye className="h-4 w-4" />
                                            View
                                        </Button>
                                    </div>
                                    <CardDescription className="flex items-center gap-4 text-sm">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="h-4 w-4" />
                                            {new Date(response.submittedAt).toLocaleDateString()} {new Date(response.submittedAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                                        </div>
                                    </CardDescription>
                                    <CardDescription className="flex items-center gap-1 text-sm">
                                        <MessageSquare className="h-4 w-4" />
                                        {answeredQuestions} answers
                                    </CardDescription>
                                </CardHeader>
                                
                                <CardContent className="pt-0">
                                    <div className="space-y-2 text-sm">
                                        {Object.entries(response.answers).slice(0, 3).map(([questionId, answer]) => (
                                            <div key={questionId} className="border-b border-neutral-100 pb-2 last:border-b-0">
                                                <div className="font-medium text-neutral-600 mb-1 text-xs">
                                                    {getQuestionLabel(questionId).length > 25 
                                                        ? `${getQuestionLabel(questionId).slice(0, 25)}...` 
                                                        : getQuestionLabel(questionId)
                                                    }:
                                                </div>
                                                <div className="text-neutral-900">
                                                    {formatAnswer(answer).length > 40 
                                                        ? `${formatAnswer(answer).slice(0, 40)}...` 
                                                        : formatAnswer(answer)
                                                    }
                                                </div>
                                            </div>
                                        ))}
                                        {answeredQuestions > 3 && (
                                            <div className="text-xs text-neutral-500 italic pt-2">
                                                +{answeredQuestions - 3} more answers
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Response Details Modal */}
            {selectedResponse && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                    <div className="w-full max-w-4xl max-h-[85vh] bg-white rounded-xl shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b bg-white">
                            <div>
                                <h2 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
                                    <Hash className="h-6 w-6 text-neutral-400" />
                                    Response {selectedResponse.id.slice(-8)}
                                </h2>
                                <p className="text-sm text-neutral-600 mt-1">
                                    Submitted on {new Date(selectedResponse.submittedAt).toLocaleString()}
                                </p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={closeModal} className="text-neutral-400 hover:text-neutral-600">
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </Button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6" style={{ maxHeight: 'calc(85vh - 140px)' }}>
                            <div className="space-y-6">
                                {/* Response Metadata */}
                                <div className="bg-neutral-50 p-4 rounded-lg">
                                    <h3 className="font-medium text-neutral-900 mb-3">Response Details</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-neutral-600">Response ID:</span>
                                            <div className="font-mono text-neutral-900">{selectedResponse.id}</div>
                                        </div>
                                        <div>
                                            <span className="text-neutral-600">Total Answers:</span>
                                            <div className="font-medium text-neutral-900">{Object.keys(selectedResponse.answers).length}</div>
                                        </div>
                                        <div>
                                            <span className="text-neutral-600">Started:</span>
                                            <div className="text-neutral-900">{new Date(selectedResponse.startedAt).toLocaleString()}</div>
                                        </div>
                                        <div>
                                            <span className="text-neutral-600">Submitted:</span>
                                            <div className="text-neutral-900">{new Date(selectedResponse.submittedAt).toLocaleString()}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* All Answers */}
                                <div>
                                    <h3 className="font-medium text-neutral-900 mb-4">All Answers</h3>
                                    <div className="space-y-4">
                                        {Object.entries(selectedResponse.answers).map(([questionId, answer]) => (
                                            <div key={questionId} className="border border-neutral-200 p-4 rounded-lg">
                                                <div className="font-medium text-neutral-700 mb-2">
                                                    {getQuestionLabel(questionId)}
                                                </div>
                                                <div className="text-neutral-900 whitespace-pre-wrap bg-neutral-50 p-3 rounded border">
                                                    {formatAnswer(answer)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t bg-neutral-50">
                            <div className="flex justify-end">
                                <Button onClick={closeModal}>Close</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResponsesTab;
