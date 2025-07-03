import React from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Question } from '../../types';
import { QuestionRenderer } from './QuestionRenderer';

interface AnimatedQuestionProps {
  question: Question;
  onAnswer: (questionId: string, value: any) => void;
  onNext: (question: Question, value: any) => void;
  onBack?: () => void;
  value: any;
  isSubmitting?: boolean;
  isPreview?: boolean;
  canGoBack?: boolean;
}

const questionVariants: Variants = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -30 },
};

const AnimatedQuestion: React.FC<AnimatedQuestionProps> = ({ question, ...props }) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={question.id}
        variants={questionVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.4, ease: 'easeInOut' }}
        className="w-full"
      >
        <QuestionRenderer question={question} {...props} />
      </motion.div>
    </AnimatePresence>
  );
};

export default AnimatedQuestion;
