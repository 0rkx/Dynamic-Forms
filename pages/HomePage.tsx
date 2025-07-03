import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { motion, Variants } from 'framer-motion';
import { useAuthStore } from '../store/authStore';

const mainVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } },
};

const HomePage: React.FC = () => {
  const { user, authState } = useAuthStore();

  return (
    <div className="flex flex-col items-center justify-center text-center min-h-[calc(100vh-12rem)]">
      <motion.div
        variants={mainVariants}
        initial="hidden"
        animate="visible"
      >
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-4">
          Forms, Reimagined.
        </h1>
        <p className="max-w-2xl mx-auto text-lg md:text-xl text-neutral-600 mb-8">
          Create beautiful, intelligent forms in seconds. Just describe what you need, and let AI do the rest.
        </p>
        
        {authState === 'authenticated' && user ? (
          <Link to="/create">
            <Button size="lg" className="font-bold">
              Create a Form
            </Button>
          </Link>
        ) : (
          <div className="space-y-4">
            <Link to="/create">
              <Button size="lg" className="font-bold">
                Try It Free - No Sign Up Required
              </Button>
            </Link>
            <p className="text-sm text-neutral-500">
              Create and test forms instantly. Sign up only when you're ready to publish.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default HomePage;