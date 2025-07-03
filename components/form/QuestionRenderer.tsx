import React from 'react';
import { Question } from '../../types';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import Loader from '../Loader';
import { ChevronLeft } from 'lucide-react';
import { useToast } from '../ui/Toast';

interface QuestionRendererProps {
  question: Question;
  onAnswer: (questionId: string, value: any) => void;
  onNext: (question: Question, value: any) => void;
  onBack?: () => void;
  value: any;
  isSubmitting?: boolean;
  isPreview?: boolean;
  canGoBack?: boolean;
}

const QuestionRenderer: React.FC<QuestionRendererProps> = ({ question, onAnswer, onNext, onBack, value, isSubmitting, isPreview = false, canGoBack = false }) => {
  const isFollowUp = !!question.isFollowUp;
  const { addToast } = useToast();

  const handleNextClick = () => {
    if(question.type === 'welcome') {
        onNext(question, null);
        return;
    }
    if (question.required && (value === undefined || value === '' || (Array.isArray(value) && value.length === 0))) {
      // simple validation toast
      addToast({
        type: 'warning',
        title: 'Required Field',
        message: 'This field is required. Please provide an answer before continuing.',
        duration: 4000
      });
    } else {
      onNext(question, value);
    }
  };
  
  const renderInput = () => {
    switch (question.type) {
      case 'welcome':
        return null; // No input for welcome screen
      
      case 'text':
      case 'email':
        return (
          <Input
            type={question.type === 'email' ? 'email' : 'text'}
            placeholder={question.placeholder || "Type your answer here..."}
            value={value || ''}
            onChange={(e) => onAnswer(question.id, e.target.value)}
            className={cn(
              "mt-4 w-full",
              isPreview 
                ? "text-sm h-10 px-3 py-2 border-2 rounded-xl" 
                : "text-base h-12 px-4"
            )}
            disabled={isSubmitting}
          />
        );
      
      case 'textarea':
        return (
          <Textarea
            placeholder={question.placeholder || "Type your answer here..."}
            value={value || ''}
            onChange={(e) => onAnswer(question.id, e.target.value)}
            className={cn(
              "mt-4 w-full resize-none",
              isPreview 
                ? "text-sm min-h-[80px] px-3 py-2 border-2 rounded-xl" 
                : "text-base min-h-[100px] px-4 py-3"
            )}
            disabled={isSubmitting}
          />
        );

      case 'multiple-choice':
        return (
          <div className={cn("mt-4 w-full", isPreview ? "space-y-2" : "space-y-3")}>
            {question.options?.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onAnswer(question.id, option.value);
                  setTimeout(() => onNext(question, option.value), 300);
                }}
                className={cn(
                  'w-full border-2 rounded-xl text-left transition-all duration-200 flex items-center justify-start',
                  'hover:transform hover:scale-[0.98] active:scale-[0.96]',
                  isPreview 
                    ? 'px-3 py-3 text-sm font-medium' 
                    : 'px-5 py-4 text-lg',
                  value === option.value
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-lg'
                    : 'bg-white hover:bg-neutral-50 border-neutral-300 hover:border-neutral-400'
                )}
                disabled={isSubmitting}
              >
                <span className="block w-full text-left leading-tight" style={{ wordBreak: 'break-word', hyphens: 'auto' }}>
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        );

      case 'rating':
        const ratingCount = (question.max || 5) - (question.min || 1) + 1;
        const isWideRating = ratingCount > 5;
        
        return (
          <div className="mt-6 w-full">
            <div className={cn(
              "flex justify-center w-full",
              isPreview && isWideRating ? "grid grid-cols-5 gap-2 max-w-[280px] mx-auto" : "flex-wrap gap-2",
              !isPreview && "gap-3"
            )}>
              {Array.from({ length: ratingCount }, (_, i) => {
                const ratingValue = (question.min || 1) + i;
                return (
                  <button
                    key={ratingValue}
                    onClick={() => onAnswer(question.id, ratingValue)}
                    className={cn(
                      'flex items-center justify-center rounded-xl border-2 font-bold transition-all duration-200',
                      'hover:transform hover:scale-110 active:scale-95',
                      isPreview 
                        ? 'w-10 h-10 text-sm' 
                        : 'w-14 h-14 text-lg',
                      value === ratingValue 
                        ? 'bg-neutral-900 text-white border-neutral-900 shadow-lg'
                        : 'bg-white hover:bg-neutral-100 border-neutral-300 hover:border-neutral-500'
                    )}
                    disabled={isSubmitting}
                  >
                    {ratingValue}
                  </button>
                );
              })}
            </div>
            <div className={cn(
              "flex justify-between text-neutral-500 mt-3 w-full",
              isPreview ? "text-xs px-2" : "text-sm px-4"
            )}>
              <span className={cn(
                "text-left",
                isPreview ? "max-w-[120px]" : "max-w-[150px]"
              )} style={{ wordBreak: 'break-word' }}>
                {question.minLabel || 'Not satisfied'}
              </span>
              <span className={cn(
                "text-right",
                isPreview ? "max-w-[120px]" : "max-w-[150px]"
              )} style={{ wordBreak: 'break-word' }}>
                {question.maxLabel || 'Very satisfied'}
              </span>
            </div>
          </div>
        );

      case 'quick-select':
        return (
          <div className={cn("mt-4 w-full", isPreview ? "space-y-2" : "space-y-3")}>
            {question.options?.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onAnswer(question.id, option.value);
                  setTimeout(() => onNext(question, option.value), 200);
                }}
                className={cn(
                  'w-full border-2 rounded-2xl text-center transition-all duration-300 flex items-center justify-center',
                  'hover:transform hover:scale-[0.98] active:scale-[0.96] hover:shadow-md',
                  isPreview 
                    ? 'px-4 py-3 text-sm font-semibold' 
                    : 'px-6 py-4 text-lg font-semibold',
                  value === option.value
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white border-transparent shadow-lg'
                    : 'bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 border-neutral-300 hover:border-blue-300 text-neutral-800'
                )}
                disabled={isSubmitting}
              >
                {option.label}
              </button>
            ))}
          </div>
        );

      case 'mood':
        const moodOptions = question.options || [
          { value: 'very-sad', label: '😢' },
          { value: 'sad', label: '😕' },
          { value: 'neutral', label: '😐' },
          { value: 'happy', label: '😊' },
          { value: 'very-happy', label: '😍' }
        ];
        
        return (
          <div className="mt-6 w-full">
            <div className={cn(
              "flex justify-center gap-4 w-full",
              isPreview ? "gap-2" : "gap-6"
            )}>
              {moodOptions.map((mood) => (
                <button
                  key={mood.value}
                  onClick={() => {
                    onAnswer(question.id, mood.value);
                    setTimeout(() => onNext(question, mood.value), 300);
                  }}
                  className={cn(
                    'flex flex-col items-center justify-center rounded-2xl border-2 transition-all duration-300',
                    'hover:transform hover:scale-110 active:scale-95',
                    isPreview 
                      ? 'w-12 h-12 text-2xl' 
                      : 'w-20 h-20 text-4xl',
                    value === mood.value 
                      ? 'bg-yellow-100 border-yellow-400 shadow-lg transform scale-110'
                      : 'bg-white hover:bg-yellow-50 border-neutral-300 hover:border-yellow-300'
                  )}
                  disabled={isSubmitting}
                >
                  <span>{mood.label}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 'slider':
        const sliderMin = question.min || 0;
        const sliderMax = question.max || 100;
        const sliderValue = value || sliderMin;
        
        return (
          <div className="mt-6 w-full max-w-md mx-auto">
            <div className="relative">
              <input
                type="range"
                min={sliderMin}
                max={sliderMax}
                value={sliderValue}
                onChange={(e) => onAnswer(question.id, parseInt(e.target.value))}
                className={cn(
                  "w-full h-3 bg-neutral-200 rounded-lg appearance-none cursor-pointer",
                  "slider-thumb:appearance-none slider-thumb:h-6 slider-thumb:w-6 slider-thumb:rounded-full",
                  "slider-thumb:bg-gradient-to-r slider-thumb:from-blue-500 slider-thumb:to-purple-600",
                  "slider-thumb:cursor-pointer slider-thumb:shadow-lg",
                  "focus:outline-none focus:ring-4 focus:ring-blue-200"
                )}
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #8b5cf6 ${((sliderValue - sliderMin) / (sliderMax - sliderMin)) * 100}%, #e5e7eb ${((sliderValue - sliderMin) / (sliderMax - sliderMin)) * 100}%, #e5e7eb 100%)`
                }}
                disabled={isSubmitting}
              />
              <div className={cn(
                "flex justify-between text-neutral-500 mt-3",
                isPreview ? "text-xs" : "text-sm"
              )}>
                <span>{question.minLabel || sliderMin}</span>
                <span className="font-semibold text-neutral-900">{sliderValue}</span>
                <span>{question.maxLabel || sliderMax}</span>
              </div>
            </div>
          </div>
        );

      case 'budget-range':
        const budgetRanges = question.options || [
          { value: '0-1000', label: '$0 - $1,000' },
          { value: '1000-5000', label: '$1,000 - $5,000' },
          { value: '5000-10000', label: '$5,000 - $10,000' },
          { value: '10000-25000', label: '$10,000 - $25,000' },
          { value: '25000+', label: '$25,000+' }
        ];
        
        return (
          <div className={cn("mt-4 w-full", isPreview ? "space-y-2" : "space-y-3")}>
            {budgetRanges.map((range) => (
              <button
                key={range.value}
                onClick={() => {
                  onAnswer(question.id, range.value);
                  setTimeout(() => onNext(question, range.value), 300);
                }}
                className={cn(
                  'w-full border-2 rounded-xl text-left transition-all duration-200 flex items-center justify-between',
                  'hover:transform hover:scale-[0.98] active:scale-[0.96]',
                  isPreview 
                    ? 'px-4 py-3 text-sm font-medium' 
                    : 'px-6 py-4 text-lg font-medium',
                  value === range.value
                    ? 'bg-green-100 text-green-800 border-green-400 shadow-md'
                    : 'bg-white hover:bg-green-50 border-neutral-300 hover:border-green-300'
                )}
                disabled={isSubmitting}
              >
                <span>{range.label}</span>
                <span className="text-2xl">💰</span>
              </button>
            ))}
          </div>
        );

      case 'conversation-break':
        return (
          <div className="mt-6 w-full">
            <div className={cn(
              "bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 text-center border border-blue-200",
              isPreview && "p-4"
            )}>
              <div className="text-4xl mb-3">💭</div>
              <p className={cn(
                "text-neutral-600 leading-relaxed",
                isPreview ? "text-sm" : "text-lg"
              )}>
                {question.description || "Let me think about your responses so far..."}
              </p>
            </div>
          </div>
        );
        
      default:
        return <p className={cn(isPreview ? "text-sm" : "text-base", "text-neutral-500")}>Unsupported question type.</p>;
    }
  };

  const showNextButton = !['multiple-choice', 'welcome', 'quick-select', 'mood', 'budget-range'].includes(question.type);
  const showStartButton = question.type === 'welcome';
  const isRatingAnswered = question.type === 'rating' && value !== undefined;
  const isSliderAnswered = question.type === 'slider' && value !== undefined;
  const isConversationBreak = question.type === 'conversation-break';
  
  const nextButtonLabel = () => {
    if (isSubmitting) return <Loader />;
    if (showStartButton) return "Start";
    if (isFollowUp) return "Submit";
    if (isRatingAnswered) return "Continue";
    return "Next";
  }

  return (
    <div className="w-full">
      <div className="flex items-start w-full">
        {isFollowUp && (
          <div className={cn(
            "bg-neutral-400 rounded-full flex-shrink-0 mr-3",
            isPreview ? "mt-1 w-1 h-8" : "mt-2 w-1.5 h-10"
          )} />
        )}
        <div className="flex-1 min-w-0 w-full">
          <h2 className={cn(
            "font-bold leading-tight w-full",
            isPreview 
              ? "text-lg" 
              : "text-3xl md:text-4xl"
          )} style={{ wordBreak: 'break-word', hyphens: 'auto' }}>
            {question.label}
          </h2>
          {question.description && (
            <p className={cn(
              "text-neutral-600 mt-2 leading-relaxed w-full",
              isPreview ? "text-sm" : "text-lg"
            )} style={{ wordBreak: 'break-word', hyphens: 'auto' }}>
              {question.description}
            </p>
          )}
        </div>
      </div>
      
      <div className="w-full">
        {renderInput()}
      </div>
      
      {(showNextButton || showStartButton || isRatingAnswered || isSliderAnswered || isConversationBreak) && (
        <div className={cn(
          "flex items-center gap-3 mt-6 w-full",
          isPreview ? "flex-col sm:flex-row" : ""
        )}>
          {canGoBack && onBack && !isPreview && (
            <Button 
              variant="ghost" 
              size="lg"
              onClick={onBack}
              className="rounded-xl"
            >
              <ChevronLeft className="h-5 w-5 mr-1" />
              Back
            </Button>
          )}
          <div className={cn("flex gap-3", isPreview ? "flex-col sm:flex-row w-full" : "")}>
            <Button 
              size={isPreview ? "default" : "lg"} 
              onClick={handleNextClick} 
              disabled={isSubmitting || (question.required && !value)}
              className={cn(
                "font-semibold rounded-xl",
                isPreview && "w-full sm:w-auto px-6 py-3 h-12 text-base"
              )}
            >
                {nextButtonLabel()}
            </Button>
            {isFollowUp && !isSubmitting && (
                <Button 
                  variant="ghost" 
                  size={isPreview ? "default" : "lg"}
                  onClick={() => {
                    onAnswer(question.id, 'skipped');
                    onNext(question, 'skipped');
                  }}
                  className={cn(
                    "rounded-xl",
                    isPreview && "w-full sm:w-auto px-6 py-3 h-12 text-base"
                  )}
                >
                    Skip
                </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export { QuestionRenderer };
