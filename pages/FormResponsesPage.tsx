import React, { useState } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, Share2, Edit3 } from 'lucide-react';
import { useFormStore } from '../store/formStore';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/Button';
import ResponsesTab from '../components/admin/ResponsesTab';
import AnswerAnalysisTab from '../components/admin/AnswerAnalysisTab';
import SettingsTab from '../components/admin/SettingsTab';
import BuilderTab from '../components/admin/BuilderTab';
import FormPreview from '../components/FormPreview';
import ShareModal from '../components/ShareModal';
import BuilderModal from '../components/admin/BuilderModal';

// Preview Modal Component
interface PreviewModalProps {
  form: any;
  onClose: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ form, onClose }) => {
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in-0"
      onClick={handleBackdropClick}
    >
      <div className="relative animate-in zoom-in-95">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-colors z-10"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        {/* Form Preview - keeping original design */}
        <FormPreview schema={form} />
      </div>
    </div>
  );
};

const FormDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { getFormById, updateForm, loadFormResponses } = useFormStore();
  
  const [form, setForm] = useState<any>(null);
  const [isLoadingForm, setIsLoadingForm] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showBuilderModal, setShowBuilderModal] = useState(false);
  const [editedQuestions, setEditedQuestions] = useState(form?.questions || []);

  const activeTab = searchParams.get('tab') || 'analysis';
  
  if (!id) return <div>Invalid form ID.</div>;
  
  const responses = useFormStore(state => state.getResponsesByFormId(id));

  // Load form asynchronously
  React.useEffect(() => {
    const loadForm = async () => {
      try {
        setIsLoadingForm(true);
        const foundForm = await getFormById(id);
        
        if (foundForm) {
          setForm(foundForm);
          setTitle(foundForm.title);
          setEditedQuestions(foundForm.questions || []);
          
          // Load responses for this form
          await loadFormResponses(id);
        } else {
          // If form is deleted or not found, redirect to admin page
          navigate('/admin');
        }
      } catch (error) {
        console.error('Error loading form:', error);
        navigate('/admin');
      } finally {
        setIsLoadingForm(false);
      }
    };

    loadForm();
  }, [id, getFormById, loadFormResponses, navigate]);

  if (isLoadingForm) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900 mx-auto"></div>
          <p className="mt-4 text-neutral-600">Loading form...</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-20">
          <h2 className="text-2xl font-semibold text-neutral-900">Form Not Found</h2>
          <p className="text-neutral-600 mt-2">The form you're looking for doesn't exist or has been deleted.</p>
          <Link to="/admin" className="mt-4 inline-block">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleTitleBlur = async () => {
    setIsEditingTitle(false);
    if(title.trim() && title.trim() !== form.title) {
        try {
          await updateForm(id, { title: title.trim() });
          setForm({ ...form, title: title.trim() });
        } catch (error) {
          console.error('Error updating title:', error);
          setTitle(form.title); // revert on error
        }
    } else {
        setTitle(form.title); // revert
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if(e.key === 'Enter') {
        e.currentTarget.blur();
    }
    if(e.key === 'Escape') {
        setTitle(form.title);
        setIsEditingTitle(false);
    }
  }

  const tabs = [
    { id: 'analysis', label: 'Answer Analysis' },
    { id: 'builder', label: 'Builder' },
    { id: 'responses', label: 'Raw Data' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <Link 
          to="/admin" 
          className="inline-flex items-center text-sm text-neutral-600 hover:text-neutral-900 mb-6 group transition-colors"
        >
          <svg className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
        
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <input 
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                className="text-4xl font-bold tracking-tight mt-1 bg-transparent border-b-2 border-neutral-400 focus:outline-none focus:border-neutral-900 w-full"
                autoFocus
              />
            ) : (
              <h1 
                className="text-4xl font-bold tracking-tight mt-1 cursor-pointer hover:text-neutral-700 transition-colors group"
                onClick={() => setIsEditingTitle(true)}
              >
                {form.title}
                <svg className="w-5 h-5 ml-2 inline opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </h1>
            )}
            <p className="text-lg text-neutral-500 mt-2">{form.description}</p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-row sm:flex-col gap-3 pt-1 flex-shrink-0 sm:pt-1 justify-end sm:justify-start">
            <Button
              onClick={() => setShowPreviewModal(true)}
              variant="outline"
              size="default"
              className="flex items-center gap-2 min-w-[100px] sm:min-w-[120px] justify-center sm:justify-start hover:bg-neutral-50 border-neutral-300 transition-all px-3 sm:px-4"
            >
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Preview</span>
            </Button>
            <Button
              onClick={() => setShowBuilderModal(true)}
              variant="outline"
              size="default"
              className="flex items-center gap-2 min-w-[100px] sm:min-w-[120px] justify-center sm:justify-start hover:bg-blue-50 border-blue-300 text-blue-700 hover:text-blue-800 transition-all px-3 sm:px-4"
            >
              <Edit3 className="h-4 w-4" />
              <span className="hidden sm:inline">Launch Builder</span>
            </Button>
            <Button
              onClick={() => setShowShareModal(true)}
              variant="default"
              size="default"
              className="flex items-center gap-2 min-w-[100px] sm:min-w-[120px] justify-center sm:justify-start bg-neutral-900 hover:bg-neutral-800 transition-all px-3 sm:px-4"
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="border-b border-neutral-200 mb-6">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSearchParams({ tab: tab.id })}
              className={cn(
                'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                activeTab === tab.id
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      
      <div>
        {activeTab === 'analysis' && <AnswerAnalysisTab form={form} responses={responses} />}
        {activeTab === 'builder' && <BuilderTab form={form} />}
        {activeTab === 'responses' && <ResponsesTab form={form} responses={responses} />}
        {activeTab === 'settings' && <SettingsTab form={form} />}
      </div>

      {/* Modals */}
      {showPreviewModal && (
        <PreviewModal
          form={form}
          onClose={() => setShowPreviewModal(false)}
        />
      )}
      
      {showShareModal && (
        <ShareModal
          formId={form.id}
          form={form}
          onClose={() => setShowShareModal(false)}
        />
      )}
      
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
};

export default FormDetailPage;