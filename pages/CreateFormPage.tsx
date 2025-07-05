import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormStore } from '../store/formStore';
import { useAuthStore } from '../store/authStore';
import { useConfigStore } from '../store/configStore';
import { generateFormWithRetry, generateManifestoOnly } from '../lib/formGenerator';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Textarea';
import Loader from '../components/Loader';
import { motion, Variants } from 'framer-motion';
import ShareModal from '../components/ShareModal';
import { FormSchema } from '../types';
import FormPreview from '../components/FormPreview';
import FormEditor from '../components/FormEditor';
import { useToast } from '../components/ui/Toast';
import { useIsMobile } from '../lib/utils';
import MobileDesktopRestriction from '../components/MobileDesktopRestriction';

const pageVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const DETAILED_EXAMPLES: Record<string, string> = {
  "A simple contact form":
    "Create a contact form that collects the user's full name, email address, and a message. All fields should be required. The email field should validate for proper email format. Include a submit button and a confirmation message after submission.",
  "Customer feedback survey for a coffee shop":
    "Design a customer feedback survey for a coffee shop. Ask for the customer's name (optional), email (optional), their overall satisfaction (1-5 rating), favorite drink, and any suggestions for improvement. Include a question about whether they would recommend the shop to others (yes/no).",
  "Event registration for a tech meetup":
    "Build an event registration form for a tech meetup. Collect attendee's full name, email, company/organization, job title, and dietary preferences. Include a checkbox for agreeing to the event's code of conduct. Show a thank you message after successful registration.",
  "Product feedback questionnaire":
    "Create a product feedback questionnaire. Ask for the user's name (optional), email (optional), product purchased, satisfaction rating (1-10), what they liked most, what could be improved, and if they would recommend the product. Include a section for additional comments.",
  "Employee satisfaction survey":
    "Design an employee satisfaction survey. Collect department, role, years at company, satisfaction with work-life balance (1-5), satisfaction with management (1-5), and an open-ended question for suggestions. Make all questions required except for suggestions.",
  "Wedding guest RSVP form":
    "Build a wedding guest RSVP form. Ask for guest's full name, email, number of attendees, meal preference (vegetarian, non-vegetarian, vegan), and any dietary restrictions. Include a field for a personal message to the couple. Show a confirmation after submission."
};

const CreateFormPage: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newlyCreatedFormId, setNewlyCreatedFormId] = useState<string | null>(null);
  const [previewSchema, setPreviewSchema] = useState<FormSchema | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const navigate = useNavigate();
  const addForm = useFormStore((state) => state.addForm);
  const getFormById = useFormStore((state) => state.getFormById);
  const pendingForm = useFormStore((state) => state.pendingForm);
  const setPendingForm = useFormStore((state) => state.setPendingForm);
  const clearPendingForm = useFormStore((state) => state.clearPendingForm);
  const { user } = useAuthStore();
  const { examplePrompts, loadConfig } = useConfigStore();
  const { addToast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    const publishPendingForm = async () => {
      if (user && pendingForm) {
        try {
                  await addForm(pendingForm);
        setNewlyCreatedFormId(pendingForm.id);
        setPreviewSchema(null);
        clearPendingForm();
        setShowSuccessMessage(true);
        } catch (error) {
          // Don't clear the pending form on error - let user retry
          setError('Failed to publish your form after login. Please try again or check your dashboard.');
        }
      }
    };
    publishPendingForm();
  }, [user, pendingForm, setPendingForm, addForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);
    setPreviewSchema(null);

    try {
      const result = await generateFormWithRetry(prompt, {
        maxRetries: 3,
        enableAutoRetry: true,
        normalizeData: true,
        fallbackOnError: true
      });
      
      if (result.success && result.form) {
        // Now, generate the manifesto
        const manifestoResult = await generateManifestoOnly(prompt);
        if (manifestoResult.success) {
          result.form.manifesto = manifestoResult.manifesto;
          result.form.manifestoData = manifestoResult.manifestoData;
        } else {
          // Even if manifesto fails, we can proceed with the form
        }
        setPreviewSchema(result.form);
      } else {
        setError(result.error || 'Failed to generate form. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAcceptAndPublish = async () => {
    const formToPublish = previewSchema || pendingForm;
    if (!formToPublish) return;

    if (user) {
      try {
        await addForm(formToPublish);
        setNewlyCreatedFormId(formToPublish.id);
        setPreviewSchema(null);
        if (pendingForm) clearPendingForm();
        setShowSuccessMessage(true);
      } catch (error) {
        setError('Failed to publish the form. Please try again.');
      }
    } else {
      setPendingForm(formToPublish);
      navigate('/auth');
    }
  };

  const handleRetryPendingForm = async () => {
    if (user && pendingForm) {
      try {
        await addForm(pendingForm);
        setNewlyCreatedFormId(pendingForm.id);
        setPreviewSchema(null);
        clearPendingForm();
        setError(null);
        setShowSuccessMessage(true);
      } catch (error) {
        setError('Failed to publish your form. Please try again or contact support.');
      }
    }
  };



  const handleRetry = () => {
    setPreviewSchema(null);
    setPrompt('');
  };

  const handleCloseModal = () => {
    setNewlyCreatedFormId(null);
    navigate('/admin');
  };

  // Show share modal if form was just created
  const [formForSharing, setFormForSharing] = useState<FormSchema | undefined>(undefined);

  useEffect(() => {
    if (newlyCreatedFormId) {
      getFormById(newlyCreatedFormId).then((form) => {
        setFormForSharing(form);
      });
    }
  }, [newlyCreatedFormId, getFormById]);

  const shareModal = newlyCreatedFormId ? (
    <ShareModal 
      formId={newlyCreatedFormId}
      form={formForSharing}
      onClose={handleCloseModal}
      title="Form Created!"
      description="Share this link with your audience."
      showDashboardButton={true}
    />
  ) : null;

  const handleExampleClick = (label: string) => {
    setPrompt(DETAILED_EXAMPLES[label] || label);
  };

  const detailedPlaceholder =
    "E.g. Feedback form for a SaaS product. Collect user's name, email (required), satisfaction rating (1-5), feature requests, and additional comments.";

  const previewContent = (
    <>
      <motion.div
        key="preview"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Fine-tune Your Form</h1>
            <p className="mt-2 text-base sm:text-lg text-neutral-600">Edit questions, add logic, and preview your form in real-time.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
            <div className="lg:order-1 w-full lg:w-1/2">
                <FormEditor 
                    schema={previewSchema!}
                    onSchemaChange={setPreviewSchema}
                />
            </div>
            <div className="lg:order-2 w-full lg:w-1/2">
                <div className="sticky top-4 sm:top-6 lg:top-24">
                    <FormPreview schema={previewSchema!} />
                </div>
            </div>
        </div>

        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <Button variant="outline" size="lg" onClick={handleRetry} className="w-full sm:w-auto">
                Retry with New Prompt
            </Button>
            <Button size="lg" onClick={handleAcceptAndPublish} className="w-full sm:w-auto">
                {user ? 'Publish Form' : 'Sign Up to Publish'}
            </Button>
        </div>
      </motion.div>
      {shareModal}
    </>
  );

  if (previewSchema) {
    if (isMobile) {
      return (
        <MobileDesktopRestriction
          title="Form Builder - Desktop Experience Recommended"
          description="The form builder with advanced editing features is optimized for desktop use. For the best experience, we recommend using a desktop or laptop computer."
        >
          {previewContent}
        </MobileDesktopRestriction>
      );
    }
    return previewContent;
  }

  const createFormContent = (
    <>
      <motion.div 
        key="create"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        className="max-w-2xl mx-auto px-4 sm:px-6"
      >
        <div className="text-center mb-8 sm:mb-10">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Create a New Form</h1>
          <p className="mt-2 text-base sm:text-lg text-neutral-600">Describe the form you want to build. Be as specific as you like.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={detailedPlaceholder}
              className="text-base min-h-[120px] w-full"
              rows={5}
              disabled={isLoading}
              aria-label="Form description prompt"
            />
            <div className="mt-3">
              <p className="text-sm text-neutral-600 mb-2">Or try an example:</p>
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
                {examplePrompts.map(p => (
                  <Button key={p} type="button" variant="outline" size="sm" onClick={() => handleExampleClick(p)} className="w-full sm:w-auto">
                    {p}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          
          {showSuccessMessage && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <p className="text-green-600 text-sm sm:text-base mb-3">
                ✅ Form published successfully! You can find it in your dashboard.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={() => navigate('/admin')}
                  variant="outline" 
                  size="sm"
                  className="text-green-700 border-green-300 hover:bg-green-100"
                >
                  Go to Dashboard
                </Button>
                <Button 
                  onClick={() => setShowSuccessMessage(false)}
                  variant="ghost" 
                  size="sm"
                  className="text-green-600 hover:bg-green-100"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-600 text-sm sm:text-base mb-3">{error}</p>
              {pendingForm && user && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    onClick={handleRetryPendingForm}
                    variant="outline" 
                    size="sm"
                    className="text-red-700 border-red-300 hover:bg-red-100"
                  >
                    Retry Publishing
                  </Button>

                  <Button 
                    onClick={clearPendingForm}
                    variant="ghost" 
                    size="sm"
                    className="text-red-600 hover:bg-red-100"
                  >
                    Clear Pending Form
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading || !prompt.trim()} className="min-w-[120px] w-full sm:w-auto">
              {isLoading ? <Loader /> : 'Generate Form'}
            </Button>
          </div>
        </form>
      </motion.div>
      {shareModal}
    </>
  );

  if (isMobile) {
    return (
      <MobileDesktopRestriction
        title="Form Creator - Desktop Experience Recommended"
        description="The AI form generator works best on desktop with a larger screen and full keyboard. For optimal form creation, we recommend using a desktop or laptop computer."
      >
        {createFormContent}
      </MobileDesktopRestriction>
    );
  }

  return createFormContent;
};

export default CreateFormPage;