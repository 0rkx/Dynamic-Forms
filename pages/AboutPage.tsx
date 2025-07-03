import React from 'react';
import { motion, Variants } from 'framer-motion';
import { Button } from '../components/ui/Button';

const mainVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } },
};

const AboutPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center text-center min-h-[calc(100vh-12rem)]">
      <motion.div
        variants={mainVariants}
        initial="hidden"
        animate="visible"
      >
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-4">
          About Dynamic Forms
        </h1>
        <p className="max-w-2xl mx-auto text-lg md:text-xl text-neutral-600 mb-8">
          We're building the future of form creation. Describe what you need, and let AI do the rest.
        </p>
        <p className="max-w-xl mx-auto text-neutral-500 mb-4">
          Born from frustration with complex form builders, we created a platform that understands your needs and builds beautiful forms in seconds.
        </p>
        <p className="max-w-xl mx-auto text-neutral-500 mb-8">
          Get powerful insights with built-in user analysis and answer analysis to understand your responses better.
        </p>
        <a href="mailto:forms@orkx.xyz?subject=General%20Inquiry">
          <Button size="lg" className="font-bold">
            Get in Touch
          </Button>
        </a>
      </motion.div>
    </div>
  );
};

export default AboutPage; 