import React, { useState } from 'react';
import { FormSchema } from '../../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { useFormStore } from '../../store/formStore';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import ShareModal from '../ShareModal';
import ManifestoModal from './ManifestoModal';
import ViewManifestoModal from './ViewManifestoModal';

interface SettingsTabProps {
    form: FormSchema;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ form }) => {
    const { duplicateForm, deleteForm, updateForm, getFormById, getResponsesByFormId, error } = useFormStore();
    const navigate = useNavigate();
    const [duplicatedFormId, setDuplicatedFormId] = useState<string | null>(null);
    const [duplicatedForm, setDuplicatedForm] = useState<FormSchema | undefined>(undefined);
    const [showManifestoModal, setShowManifestoModal] = useState(false);
    const [manifestoModalMode, setManifestoModalMode] = useState<'view' | 'edit'>('view');
    const [loadingStates, setLoadingStates] = useState({
        intelligence: false,
        duplicating: false,
        deleting: false,
    });
    const [actionError, setActionError] = useState<string | null>(null);

    const handleDuplicate = async () => {
        try {
            setLoadingStates(prev => ({ ...prev, duplicating: true }));
            setActionError(null);
            
            const newForm = await duplicateForm(form.id);
            if (newForm) {
                setDuplicatedFormId(newForm.id);
                setDuplicatedForm(newForm);
            } else {
                throw new Error('Failed to duplicate form');
            }
        } catch (error: any) {
            console.error('Error duplicating form:', error);
            setActionError(error.message || 'Failed to duplicate form');
        } finally {
            setLoadingStates(prev => ({ ...prev, duplicating: false }));
        }
    };

    const handleCloseDuplicateModal = () => {
        const formId = duplicatedFormId;
        setDuplicatedFormId(null);
        setDuplicatedForm(undefined);
        
        if (formId) {
            navigate(`/admin/form/${formId}?tab=settings`);
        }
    };

    const handleDelete = async () => {
        try {
            const responseCount = getResponsesByFormId(form.id).length;
            const confirmMessage = `Are you sure you want to delete "${form.title}"? This will also delete all ${responseCount} of its responses. This action cannot be undone.`;
            
            if (window.confirm(confirmMessage)) {
                setLoadingStates(prev => ({ ...prev, deleting: true }));
                setActionError(null);
                
                await deleteForm(form.id);
                navigate('/admin');
            }
        } catch (error: any) {
            console.error('Error deleting form:', error);
            setActionError(error.message || 'Failed to delete form');
        } finally {
            setLoadingStates(prev => ({ ...prev, deleting: false }));
        }
    };

    const handleIntelligenceToggle = async (enabled: boolean) => {
        // Optimistically update UI, but store original value to revert on error
        const originalState = form.intelligentFollowUps;
        setLoadingStates(prev => ({ ...prev, intelligence: true }));
        setActionError(null);
    
        try {
            // This now directly mutates the store state, which should trigger re-renders
            useFormStore.setState(state => {
                const formToUpdate = state.forms.find(f => f.id === form.id);
                if (formToUpdate) {
                    formToUpdate.intelligentFollowUps = enabled;
                }
                return { forms: [...state.forms] };
            });

            await updateForm(form.id, { intelligentFollowUps: enabled });
        } catch (error: any) {
            console.error('Error updating form:', error);
            setActionError(error.message || 'Failed to update intelligence setting');
            
            // Revert optimistic update on error
            useFormStore.setState(state => {
                const formToUpdate = state.forms.find(f => f.id === form.id);
                if (formToUpdate) {
                    formToUpdate.intelligentFollowUps = originalState;
                }
                return { forms: [...state.forms] };
            });
        } finally {
            setLoadingStates(prev => ({ ...prev, intelligence: false }));
        }
    };

    const handleManifestoSave = async (manifesto: string, manifestoData: any) => {
        try {
            setActionError(null);
            await updateForm(form.id, { 
                manifesto: manifesto,
                manifestoData: manifestoData
            });
            // Switch back to view mode after saving
            setManifestoModalMode('view');
        } catch (error: any) {
            console.error('Error updating manifesto:', error);
            setActionError(error.message || 'Failed to update manifesto');
        }
    };

    const handleViewManifesto = () => {
        setManifestoModalMode('view');
        setShowManifestoModal(true);
    };

    const handleEditManifesto = () => {
        setManifestoModalMode('edit');
    };

    const handleCloseManifestoModal = () => {
        setShowManifestoModal(false);
        setManifestoModalMode('view');
    };

    return (
        <>
            <div className="max-w-2xl space-y-8">
                {(actionError || error) && (
                    <Card className="border-red-500 bg-red-50">
                        <CardContent className="pt-6">
                            <p className="text-red-600 text-sm">
                                {actionError || error}
                            </p>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Intelligence Settings</CardTitle>
                        <CardDescription>
                            Enable to allow the form to ask smart follow-up questions for vague or short answers, providing deeper insights.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={!!form.intelligentFollowUps}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleIntelligenceToggle(!form.intelligentFollowUps)
                                    }}
                                    disabled={loadingStates.intelligence}
                                    className={cn(
                                        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2',
                                        form.intelligentFollowUps ? 'bg-neutral-900' : 'bg-neutral-300',
                                        loadingStates.intelligence && 'opacity-50 cursor-not-allowed'
                                    )}
                                >
                                    <span
                                        aria-hidden="true"
                                        className={cn(
                                            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                                            form.intelligentFollowUps ? 'translate-x-5' : 'translate-x-0'
                                        )}
                                    />
                                </button>
                                <span className="text-sm font-medium text-neutral-700">
                                    {form.intelligentFollowUps ? 'Enabled' : 'Disabled'}
                                </span>
                            </div>
                            
                            {form.intelligentFollowUps && (
                                <div className="pt-4 border-t border-neutral-200">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-medium text-neutral-900">AI Manifesto</h4>
                                            <p className="text-xs text-neutral-600">View your product vision that guides intelligent follow-ups</p>
                                        </div>
                                        <Button
                                            onClick={handleViewManifesto}
                                            variant="outline"
                                            size="sm"
                                            className="text-blue-700 border-blue-300 hover:bg-blue-50"
                                        >
                                            View Manifesto
                                        </Button>
                                    </div>
                                    {(() => {
                                        // Check if manifesto has actual content
                                        const hasManifesto = form.manifesto 
                                            || (form.manifestoData && (
                                                form.manifestoData.productVision?.trim() ||
                                                form.manifestoData.targetAudience?.trim() ||
                                                (form.manifestoData.businessGoals && form.manifestoData.businessGoals.some(goal => goal?.trim())) ||
                                                (form.manifestoData.keyQuestionAreas && form.manifestoData.keyQuestionAreas.some(area => area?.trim()))
                                            ));
                                        
                                        return hasManifesto ? (
                                            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                                <p className="text-xs text-green-800 font-medium">Manifesto configured</p>
                                                <p className="text-xs text-green-700 mt-1 line-clamp-2">
                                                    {form.manifesto || 
                                                     form.manifestoData?.productVision || 
                                                     'Structured manifesto data available'}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                                <p className="text-xs text-amber-800 font-medium">No manifesto configured</p>
                                                <p className="text-xs text-amber-700 mt-1">A manifesto will help guide intelligent follow-up questions</p>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Duplicate Form</CardTitle>
                        <CardDescription>
                            Create a new copy of this form, including all its questions and logic. Responses will not be copied.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button 
                            onClick={handleDuplicate} 
                            disabled={loadingStates.duplicating || loadingStates.deleting}
                        >
                            {loadingStates.duplicating ? 'Duplicating...' : 'Duplicate'}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="border-red-500">
                    <CardHeader>
                        <CardTitle>Danger Zone</CardTitle>
                        <CardDescription>
                            Deleting a form is permanent and will also remove all of its associated responses.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button 
                            variant="destructive" 
                            onClick={handleDelete}
                            disabled={loadingStates.deleting || loadingStates.duplicating}
                        >
                            {loadingStates.deleting ? 'Deleting...' : 'Delete This Form'}
                        </Button>
                    </CardContent>
                </Card>
            </div>
            {duplicatedFormId && duplicatedForm && (
                <ShareModal 
                    formId={duplicatedFormId}
                    form={duplicatedForm}
                    onClose={handleCloseDuplicateModal}
                    title="Form Duplicated!"
                    description="Your form has been successfully duplicated. Share this link with your audience."
                    showDashboardButton={false}
                />
            )}
            
            {showManifestoModal && (
                <>
                    {manifestoModalMode === 'view' ? (
                        <ViewManifestoModal
                            form={form}
                            onClose={handleCloseManifestoModal}
                            onEdit={handleEditManifesto}
                        />
                    ) : (
                        <ManifestoModal
                            form={form}
                            onClose={handleCloseManifestoModal}
                            onSave={handleManifestoSave}
                        />
                    )}
                </>
            )}
        </>
    )
}

export default SettingsTab;
