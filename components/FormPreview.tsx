import React, { useState, useEffect } from 'react';
import { FormSchema, Question } from '../types';
import AnimatedQuestion from './form/AnimatedQuestion';
import { motion, Variants } from 'framer-motion';
import { Button } from './ui/Button';
import { RefreshCcw } from 'lucide-react';
import { generateIntelligentFollowUp, createConversationContext } from '../lib/gemini';

interface FormPreviewProps {
  schema: FormSchema;
}

const completionVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const progressBarVariants: Variants = {
  initial: { width: 0 },
};

const FormPreview: React.FC<FormPreviewProps> = ({ schema }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [localQuestions, setLocalQuestions] = useState<Question[]>(schema.questions);
  const [isGeneratingFollowUp, setIsGeneratingFollowUp] = useState(false);
  
  // New conversation context state
  const [conversationContexts, setConversationContexts] = useState<Record<string, {
    rootQuestion: Question;
    conversationHistory: Array<{
      question: Question;
      answer: string;
    }>;
  }>>({});
  const [followUpCounters, setFollowUpCounters] = useState<Record<string, number>>({});
  const [totalFollowUpsShown, setTotalFollowUpsShown] = useState(0);
  const maxTotalFollowUps = Math.min(schema.aiConfig?.maxDynamicQuestions ?? 2, 2);
  const maxFollowUpsPerQuestion = 1;

  const progress = ((currentQuestionIndex) / (localQuestions.length-1)) * 100;

  useEffect(() => {
    // Reset on schema change
    setCurrentQuestionIndex(0);
    setAnswers({});
    setIsCompleted(false);
    setLocalQuestions(schema.questions);
  }, [schema]);

  const handleAnswer = (questionId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };
  
  const handleRestart = () => {
      setCurrentQuestionIndex(0);
      setAnswers({});
      setIsCompleted(false);
      setLocalQuestions(schema.questions);
      setIsGeneratingFollowUp(false);
  }

  const handleNext = async (currentQuestion: Question, value: any) => {
    // Update answers state
    const newAnswers = { ...answers, [currentQuestion.id]: value };
    setAnswers(newAnswers);

    // Enhanced Intelligent Follow-up Logic with Conversation Context
    if (schema.intelligentFollowUps && 
        schema.manifesto && 
        value && 
        (currentQuestion.type === 'text' || currentQuestion.type === 'textarea' || currentQuestion.type === 'multiple-choice') &&
        totalFollowUpsShown < maxTotalFollowUps) {
      
      // Determine the conversation thread key
      const conversationKey = currentQuestion.isFollowUp ? 
          (currentQuestion.originalQuestionId || currentQuestion.id) : 
          currentQuestion.id;
      
      // Get or create conversation context
      let conversationContext = conversationContexts[conversationKey];
      
      if (!conversationContext) {
          // Initialize new conversation context
          const rootQuestion = currentQuestion.isFollowUp ? 
              localQuestions.find(q => q.id === currentQuestion.originalQuestionId) || currentQuestion :
              currentQuestion;
          
          conversationContext = createConversationContext(rootQuestion);
      }
      
      // Keep previews concise: one follow-up per original question.
      const currentThreadLength = conversationContext.conversationHistory.length;
      const rootQuestionFollowUpCount = followUpCounters[conversationKey] || 0;
      
      if (currentThreadLength < maxFollowUpsPerQuestion && rootQuestionFollowUpCount < maxFollowUpsPerQuestion) {
        setIsGeneratingFollowUp(true);
        
        try {
          // Add current exchange to conversation history
          const updatedHistory = [...conversationContext.conversationHistory, {
              question: currentQuestion,
              answer: value
          }];
          
          const contextToSend = {
              ...conversationContext,
              conversationHistory: updatedHistory
          };
          
          // Use enhanced context-aware follow-up generation (now the default)
          const followUpQuestion = await generateIntelligentFollowUp(
            schema.manifesto,
            contextToSend,
            currentQuestion,
            value,
            newAnswers
          );

          if (followUpQuestion && followUpQuestion.label) {
            // Create a new follow-up question
            const newFollowUp: Question = {
              id: `${conversationKey}_followup_${rootQuestionFollowUpCount + 1}_${Date.now()}`,
              type: followUpQuestion.type || 'text',
              label: followUpQuestion.label,
              description: followUpQuestion.description,
              placeholder: followUpQuestion.placeholder,
              options: followUpQuestion.options,
              required: followUpQuestion.required || false,
              isFollowUp: true,
              originalQuestionId: conversationKey
            };

            // Insert the follow-up question right after the current question
            const newQuestions = [...localQuestions];
            newQuestions.splice(currentQuestionIndex + 1, 0, newFollowUp);
            setLocalQuestions(newQuestions);
            
            // Update conversation context with the new history
            setConversationContexts(prev => ({
                ...prev,
                [conversationKey]: {
                    ...contextToSend,
                    conversationHistory: updatedHistory
                }
            }));

            setFollowUpCounters(prev => ({ 
                ...prev, 
                [conversationKey]: rootQuestionFollowUpCount + 1 
            }));
            setTotalFollowUpsShown(prev => prev + 1);
          }
        } catch (error) {
          console.error('Error generating follow-up question:', error);
        } finally {
          setIsGeneratingFollowUp(false);
        }
      }
    }

    // Move to next question
    if (currentQuestionIndex < localQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const renderContent = () => {
    if (isCompleted) {
        return (
          <motion.div
            key="completion-screen"
            variants={completionVariants}
            initial="initial"
            animate="animate"
            className="text-center flex flex-col justify-center items-center h-full w-full px-1"
          >
            <h2 className="text-base font-bold mb-3">End of Preview</h2>
            <p className="text-neutral-600 mb-4 text-xs leading-relaxed px-2">You've seen all the questions in this form.</p>
            <Button onClick={handleRestart} variant="outline" size="sm" className="text-xs px-4 py-1.5 h-8">
                <RefreshCcw className="mr-1.5 h-3 w-3" />
                Restart
            </Button>
          </motion.div>
        );
      }
  
    const currentQuestion = localQuestions[currentQuestionIndex];
    return (
        <AnimatedQuestion
            key={currentQuestion.id}
            question={currentQuestion}
            onAnswer={handleAnswer}
            onNext={handleNext}
            value={answers[currentQuestion.id]}
            isPreview={true}
            isSubmitting={isGeneratingFollowUp}
        />
    )
  }

  return (
    <div className="bg-neutral-100 rounded-2xl p-3 shadow-lg border border-neutral-200 w-full">
        {/* Mobile device frame */}
        <div className="w-full max-w-[375px] mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-neutral-200">
            {/* Status bar simulation */}
            <div className="h-6 bg-neutral-900 rounded-t-2xl flex items-center justify-center">
                <div className="flex items-center space-x-1">
                    <div className="w-1 h-1 bg-white rounded-full"></div>
                    <div className="w-1 h-1 bg-white rounded-full"></div>
                    <div className="w-1 h-1 bg-white rounded-full"></div>
                </div>
            </div>
            
            {/* Progress bar */}
            <div className="w-full h-1 bg-neutral-200 flex-shrink-0">
                <motion.div
                    className="h-1 bg-neutral-900"
                    variants={progressBarVariants}
                    initial="initial"
                    animate={{ width: `${isCompleted ? 100 : progress}%` }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                />
            </div>
            
            {/* Content area with proper constraints */}
            <div 
                className="h-[600px] flex flex-col overflow-hidden"
                style={{ width: '375px' }}
            >
                <div className="flex-1 overflow-hidden">
                    <div className="h-full overflow-y-auto">
                        <div className="p-4 min-h-full flex items-center">
                            <div className="w-full">
                                {renderContent()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        {/* Mobile preview label */}
        <div className="text-center mt-3">
            <span className="text-xs text-neutral-500 font-medium">Mobile Preview</span>
        </div>
    </div>
  );
};

export default FormPreview;
