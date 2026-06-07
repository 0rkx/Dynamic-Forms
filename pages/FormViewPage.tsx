import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFormStore } from '../store/formStore';
import { FormSchema, Question, QuestionType } from '../types';
import AnimatedQuestion from '../components/form/AnimatedQuestion';
import { motion, Variants } from 'framer-motion';
import { generateIntelligentFollowUp, createConversationContext } from '../lib/gemini';
import { createSmartFormBrain } from '../lib/formBrainMigration';
import { AlertCircle, Brain } from 'lucide-react';
import { supabaseService } from '../lib/supabaseService';
import { useToast } from '../components/ui/Toast';


const completionVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const progressBarVariants: Variants = {
  initial: { width: 0 },
};


const FormViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getFormById, addResponse, addFormView, forms } = useFormStore();
  const { addToast } = useToast();

  const [form, setForm] = useState<FormSchema | null>(null);
  const [formNotFound, setFormNotFound] = useState(false);
  const [localQuestions, setLocalQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [isLoadingFollowUp, setIsLoadingFollowUp] = useState(false);
  const [questionHistory, setQuestionHistory] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // AI Brain state
  const [formBrain, setFormBrain] = useState<any | null>(null);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  
  // Intelligence feature state
  const [followUpCounters, setFollowUpCounters] = useState<Record<string, number>>({});
  const [totalFollowUpsShown, setTotalFollowUpsShown] = useState(0);
  
  // New conversation context state
  const [conversationContexts, setConversationContexts] = useState<Record<string, {
    rootQuestion: Question;
    conversationHistory: Array<{
      question: Question;
      answer: string;
    }>;
  }>>({});
  
  // Store the resolved manifesto
  const [resolvedManifesto, setResolvedManifesto] = useState<string | null>(null);

  const currentQuestion = localQuestions[currentQuestionIndex];
  
  const originalQuestionsAnsweredCount = localQuestions
    .slice(0, currentQuestionIndex + 1)
    .filter(q => !q.isFollowUp).length;
  const progress = form ? ((originalQuestionsAnsweredCount - 1) / (form.questions.length - 1)) * 100 : 0;

  // Load form from Supabase database
  const loadFormFromDatabase = async (formId: string): Promise<FormSchema | null> => {
    try {
      setFormNotFound(false);
      const foundForm = await getFormById(formId);
      
      if (!foundForm) {
        console.warn(`Form with ID ${formId} not found in database`);
        return null;
      }
      
      return foundForm;
    } catch (error: any) {
      console.error('Error loading form from database:', error);
      // Check if it's a connection error
      if (error.message?.includes('connection') || error.message?.includes('network')) {
        throw new Error('Unable to connect to the database. Please check your internet connection and try again.');
      }
      throw error;
    }
  };

  useEffect(() => {
    if (id) {
      const loadForm = async () => {
        try {
          // Run comprehensive database diagnostics to identify response storage issues
          console.log('Running database diagnostics for response storage...');
          await supabaseService.runDatabaseDiagnostics();
          
          const foundForm = await loadFormFromDatabase(id);
          
          if (foundForm) {
            setForm(foundForm);
            setLocalQuestions(foundForm.questions);
            
            // Initialize AI Brain if enabled
            if (foundForm.aiConfig?.enabled || foundForm.intelligentFollowUps) {
              const brain = createSmartFormBrain(foundForm);
              // We purposely don’t type this strictly so it can handle both brain versions
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              setFormBrain(brain as any);
            }
            
            addFormView(id); // Track form view for analytics
            setStartTime(new Date().toISOString()); // Track start time for analytics
            setFormNotFound(false);
          } else {
            // Form not found - show error message
            setFormNotFound(true);
            setForm(null);
            addToast({
              type: 'error',
              title: 'Form Not Found',
              message: 'The form you\'re looking for doesn\'t exist or may have been deleted.',
              duration: 6000
            });
          }
        } catch (error: any) {
          console.error('Failed to load form:', error);
          setFormNotFound(true);
          setForm(null);
          addToast({
            type: 'error',
            title: 'Form Loading Error',
            message: 'Failed to load the form. Please check your internet connection and try again.',
            duration: 6000
          });
        }
      };

      loadForm();
    }
  }, [id, getFormById, addFormView]);

  const handleAnswer = (questionId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleBack = () => {
    if (questionHistory.length > 1) {
      const newHistory = [...questionHistory];
      newHistory.pop(); // Remove current question from history
      const previousIndex = newHistory[newHistory.length - 1];
      
      setCurrentQuestionIndex(previousIndex);
      setQuestionHistory(newHistory);
    }
  };

  const submitFormResponse = async () => {
    if (!id || !startTime) {
      console.error('Cannot submit response: missing form ID or start time');
      return false;
    }

    // Validate we have some answers
    if (Object.keys(answers).length === 0) {
      console.warn('Submitting response with no answers');
    }

    console.log('Submitting response:', {
      formId: id,
      startedAt: startTime,
      answersCount: Object.keys(answers).length,
      answers: answers
    });

    setIsSubmitting(true);
    
    try {
      await addResponse({ 
        formId: id, 
        answers, 
        startedAt: startTime 
      });
      console.log('Response submitted successfully');
      addToast({
        type: 'success',
        title: 'Response Submitted',
        message: 'Thank you! Your response has been saved successfully.',
        duration: 5000
      });
      return true;
    } catch (error: any) {
      console.error('Failed to submit response:', error);
      // Show error to user but still complete the form
      addToast({
        type: 'error',
        title: 'Submission Error',
        message: 'There was an issue saving your response. Please try again or contact support.',
        duration: 8000
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const advanceToNext = async (targetIndex?: number) => {
    const nextIndex = targetIndex !== undefined ? targetIndex : currentQuestionIndex + 1;
    
    if (localQuestions && nextIndex < localQuestions.length) {
      setCurrentQuestionIndex(nextIndex);
      // Add to history only if we're not jumping to a specific index from conditional logic
      if (targetIndex === undefined) {
        setQuestionHistory(prev => [...prev, nextIndex]);
      } else {
        // For conditional logic jumps, we still want to track the path
        setQuestionHistory(prev => [...prev, nextIndex]);
      }
    } else {
      // Form finished - submit response
      await submitFormResponse();
      setIsCompleted(true);
    }
  };

  // Accept decisions from both the standard and enhanced brains
  const handleAIBrainDecision = async (decision: any, currentQuestion: Question, value: any) => {
    console.log('AI Brain Decision:', decision);
    
    switch (decision.action) {
      case 'generate_followup':
      case 'generate_contextual_followup':
        if (decision.nextQuestion) {
          // Insert AI-generated follow-up question
          const newQuestions = [...localQuestions];
          newQuestions.splice(currentQuestionIndex + 1, 0, decision.nextQuestion);
          setLocalQuestions(newQuestions);
          await advanceToNext();
        } else {
          await advanceToNext();
        }
        break;
        
      case 'adapt_question':
        if (decision.adaptedQuestion) {
          // Replace the next question with adapted version
          const newQuestions = [...localQuestions];
          const nextIndex = currentQuestionIndex + 1;
          if (nextIndex < newQuestions.length) {
            newQuestions[nextIndex] = { ...newQuestions[nextIndex], ...decision.adaptedQuestion };
            setLocalQuestions(newQuestions);
          }
          await advanceToNext();
        } else {
          await advanceToNext();
        }
        break;
        
      case 'conclude':
        // AI decided to conclude the form early
        await submitFormResponse();
        setIsCompleted(true);
        break;
        
      case 'continue':
      default:
        await advanceToNext();
        break;
    }
  };

  const handleNext = async (currentQuestion: Question, value: any) => {
    // Use AI Brain to decide next action if available
    if (formBrain && form?.aiConfig?.enabled) {
      setIsAIThinking(true);
      
      try {
        const brainDecision = await formBrain.decideNextAction(currentQuestion, value, answers);
        await handleAIBrainDecision(brainDecision, currentQuestion, value);
        
        // Update AI insights
        const insights = formBrain.getConversationInsights();
        setAiInsights(insights.recommendations);
        
        return; // Exit early when using AI brain
      } catch (error) {
        console.error('AI Brain error, falling back to normal flow:', error);
        // Fall through to standard logic
      } finally {
        setIsAIThinking(false);
      }
    }

    // Standard flow - Check for conditional logic first
    if (currentQuestion.logic && currentQuestion.logic.length > 0 && value) {
      let matchedRule = false;
      
      for (const logicRule of currentQuestion.logic) {
        // Check if the user's answer matches this logic rule
        if (value === logicRule.onValue) {
          // Find the target question index
          const targetQuestionIndex = localQuestions.findIndex(q => q.id === logicRule.goToQuestionId);
          if (targetQuestionIndex !== -1) {
            // Jump to the target question
            await advanceToNext(targetQuestionIndex);
            matchedRule = true;
            return; // Exit early, don't run other logic
          }
        }
      }
      
      // If no rule matched, skip all conditional target questions (ELSE behavior)
      if (!matchedRule) {
        // Collect all target question IDs from the logic rules
        const targetQuestionIds = currentQuestion.logic.map(rule => rule.goToQuestionId);
        
        // Find the next question after all conditional targets
        let nextIndex = currentQuestionIndex + 1;
        while (nextIndex < localQuestions.length && targetQuestionIds.includes(localQuestions[nextIndex].id)) {
          nextIndex++;
        }
        
        // Jump to the question after all conditional targets
        if (nextIndex < localQuestions.length) {
          await advanceToNext(nextIndex);
          return;
        } else {
          // If we're at the end, complete the form
          await submitFormResponse();
          setIsCompleted(true);
          return;
        }
      }
    }

    // Check for intelligent follow-up
    const currentFollowUpCount = followUpCounters[currentQuestion.id] || 0;
    const maxTotalFollowUps = Math.min(form?.aiConfig?.maxDynamicQuestions ?? 2, 2);
    const maxFollowUpsPerQuestion = 1;
    
    // Use the resolved manifesto (which was resolved when the form loaded)
    const effectiveManifesto = resolvedManifesto;
    
    // Don't generate follow-ups for certain question types
    const skipFollowUpTypes = [
      'welcome', 
      'email', 
      'rating', 
      'quick-select',
      'name',        // Add name fields
      'phone',       // Add phone fields  
      'address',     // Add address fields
      'number',      // Add number inputs
      'date',        // Add date inputs
      'time',        // Add time inputs
      'url',         // Add URL inputs
      'file-upload', // Add file uploads
      'signature',   // Add signature fields
      'payment'      // Add payment fields
    ];
    const shouldSkipFollowUp = skipFollowUpTypes.includes(currentQuestion.type);
    
    // Also skip follow-ups for questions that are clearly basic info gathering
    const basicInfoPatterns = [
      /name/i,
      /email/i,
      /phone/i,
      /address/i,
      /contact/i,
      /how can we reach/i,
      /what.*your.*name/i,
      /first name/i,
      /last name/i,
      /full name/i,
      /company name/i,
      /organization/i
    ];
    
    const isBasicInfoQuestion = basicInfoPatterns.some(pattern => 
      pattern.test(currentQuestion.label) || 
      pattern.test(currentQuestion.description || '') ||
      pattern.test(currentQuestion.placeholder || '')
    );
    
    const shouldSkipForBasicInfo = isBasicInfoQuestion;
    
                  // Production logging removed for performance and security
    
    if (
      form?.intelligentFollowUps &&
      !currentQuestion.isFollowUp &&
      !shouldSkipFollowUp &&
      !shouldSkipForBasicInfo &&  // Add the new check
      totalFollowUpsShown < maxTotalFollowUps &&
      currentFollowUpCount < maxFollowUpsPerQuestion &&
      effectiveManifesto &&
      value !== undefined && value !== null &&
      (
        (typeof value === 'string' && value.trim().length >= 3) ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      )
    ) {
      setIsLoadingFollowUp(true);
      try {
        let context = conversationContexts[currentQuestion.id];
        if (!context) {
          context = createConversationContext(currentQuestion);
          setConversationContexts(prev => ({ ...prev, [currentQuestion.id]: context }));
        }

        const answerText = typeof value === 'string' ? value : String(value);
        const newHistoryEntry = { question: currentQuestion, answer: answerText };
        context.conversationHistory.push(newHistoryEntry);
        
        const followUpResult = await generateIntelligentFollowUp(
          effectiveManifesto,
          context,
          currentQuestion,
          answerText,
          answers
        );

        if (followUpResult && followUpResult.label) {
          // Create a unique follow-up ID that includes the original question ID and timestamp
          const uniqueFollowUpId = `${currentQuestion.id}_followup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          const followUpQuestion: Question = {
            id: uniqueFollowUpId,
            type: followUpResult.type || 'text',
            label: followUpResult.label,
            description: followUpResult.description,
            placeholder: followUpResult.placeholder,
            options: followUpResult.options || [], // Ensure options are included
            required: followUpResult.required || false,
            isFollowUp: true,
            originalQuestionId: currentQuestion.id,
          };
          
          // Production logging removed
          
          const newQuestions = [...localQuestions];
          newQuestions.splice(currentQuestionIndex + 1, 0, followUpQuestion);
          setLocalQuestions(newQuestions);
          
          setFollowUpCounters(prev => ({ ...prev, [currentQuestion.id]: currentFollowUpCount + 1 }));
          setTotalFollowUpsShown(prev => prev + 1);
          setConversationContexts(prev => ({ ...prev, [currentQuestion.id]: context }));
        }
      } catch (error) {
        // Fail closed: no synthetic follow-up when AI cannot produce one.
      } finally {
        setIsLoadingFollowUp(false);
      }
    }

    await advanceToNext();
  };

  useEffect(() => {
    if (localQuestions.length > 0 && questionHistory.length === 0) {
      setQuestionHistory([0]);
    }
  }, [localQuestions, questionHistory]);

  // Resolve the manifesto when form is loaded
  useEffect(() => {
    const resolveManifesto = async () => {
      if (!form) return;
      
      // PRIMARY: Use the stored AI manifesto from the database whenever it exists
      if (form.manifesto && form.manifesto.trim().length > 0) {
        setResolvedManifesto(form.manifesto.trim());
        return;
      }

      // SECONDARY: If we have structured manifesto data but no plain-text manifesto, convert it to text
      if (form.manifestoData) {
        const { productVision, targetAudience, businessGoals = [], keyQuestionAreas = [] } = form.manifestoData;
        const manifestoTextParts: string[] = [];
        if (productVision) manifestoTextParts.push(productVision);
        if (targetAudience) manifestoTextParts.push(`Target Audience: ${targetAudience}`);
        if (businessGoals.length) manifestoTextParts.push(`Business Goals: ${businessGoals.join(', ')}`);
        if (keyQuestionAreas.length) manifestoTextParts.push(`Key Question Areas: ${keyQuestionAreas.join(', ')}`);
        const manifestoText = manifestoTextParts.join('\n\n').trim();

        if (manifestoText) {
          setResolvedManifesto(manifestoText);
          return;
        }
      }
 
      // TERTIARY: If no stored manifesto exists and intelligent follow-ups are enabled, 
      // generate a new AI manifesto using the same system used during form creation
      if (form.intelligentFollowUps) {
        try {
          // Import the AI manifesto generation function
          const { generateManifestoOnly } = await import('../lib/formGenerator');
          
          // Create a prompt from the form data (similar to what users would input during form creation)
          const formPrompt = `Create a form about: ${form.title}. ${form.description || ''}. 
            The form has questions about: ${form.questions.map(q => q.label).join(', ')}.`;
          
          const manifestoResult = await generateManifestoOnly(formPrompt);
          
          if (manifestoResult.success && manifestoResult.manifesto) {
            setResolvedManifesto(manifestoResult.manifesto);
            return;
          }
        } catch (error) {
          // Failed to generate AI manifesto, continue to fallback
        }
      }
      
      // LAST RESORT: Generate a simple contextual manifesto only if AI generation is unavailable
      const title = form.title?.toLowerCase() || '';
      const questions = form.questions?.map(q => q.label?.toLowerCase()).join(' ') || '';
      const allText = `${title} ${questions}`;
      
      let simpleManifesto;
      if (allText.includes('feedback') || allText.includes('survey') || allText.includes('review')) {
        simpleManifesto = `We want to gather your valuable feedback to improve our services and better meet your needs. Your insights help us understand what works well and what we can enhance.`;
      } else if (allText.includes('contact') || allText.includes('support') || allText.includes('help')) {
        simpleManifesto = `We want to understand your specific needs so we can provide the best possible assistance. Your information helps us tailor our support to your situation.`;
      } else if (allText.includes('product') || allText.includes('service') || allText.includes('business')) {
        simpleManifesto = `We want to understand your business needs and objectives to provide the most relevant solutions. Your insights help us tailor our offerings to your specific requirements.`;
      } else {
        simpleManifesto = `We want to understand your needs and gather valuable insights to provide better assistance. Our goal is to learn more about your situation and help you achieve your objectives.`;
      }
      
      setResolvedManifesto(simpleManifesto);
    };

    resolveManifesto();
  }, [form]);

  // Show form not found message
  if (formNotFound) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <AlertCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Form Not Found</h1>
        <p className="text-gray-600 mb-6">
          The form you're looking for doesn't exist or may have been deleted.
        </p>
        <button
          onClick={() => navigate('/')}
          className="bg-neutral-900 text-white px-6 py-2 rounded-lg hover:bg-neutral-800 transition-colors"
        >
          Go to Home
        </button>
      </div>
    );
  }

  if (!form || !currentQuestion) {
    return <div className="text-center p-10">Loading form...</div>;
  }

  if (isCompleted) {
    return (
      <motion.div
        variants={completionVariants}
        initial="hidden"
        animate="visible"
        className="text-center max-w-xl mx-auto min-h-[50vh] flex flex-col justify-center items-center"
      >
        <h1 className="text-4xl font-bold mb-4">Thank You!</h1>
        <p className="text-lg text-neutral-600">Your response has been submitted.</p>
      </motion.div>
    );
  }

  return (
    <>
      <div className="fixed top-16 left-0 w-full h-1 bg-neutral-200">
        <motion.div
            className="h-1 bg-neutral-900"
            variants={progressBarVariants}
            initial="initial"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
        />
      </div>
      <div className="max-w-2xl mx-auto relative min-h-[60vh] pt-10">
        {/* AI Brain Thinking Indicator */}
        {isAIThinking && (
          <div className="fixed top-20 right-4 bg-blue-100 border border-blue-300 rounded-lg p-3 shadow-lg z-50">
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-blue-600 animate-pulse" />
              <span className="text-sm text-blue-800 font-medium">AI is thinking...</span>
            </div>
          </div>
        )}

        {/* AI Insights Panel (when available) */}
        {formBrain && aiInsights.length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Brain className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-semibold text-purple-800">Conversation Insights</span>
            </div>
            <div className="text-sm text-purple-700">
              {aiInsights.slice(0, 2).map((insight, index) => (
                <div key={index} className="mb-1">• {insight}</div>
              ))}
            </div>
          </div>
        )}

        <AnimatedQuestion
          key={currentQuestion.id}
          question={currentQuestion}
          onAnswer={handleAnswer}
          onNext={handleNext}
          onBack={handleBack}
          value={answers[currentQuestion.id]}
          isSubmitting={isLoadingFollowUp || isSubmitting || isAIThinking}
          canGoBack={questionHistory.length > 1}
        />
      </div>
    </>
  );
};

export default FormViewPage;
