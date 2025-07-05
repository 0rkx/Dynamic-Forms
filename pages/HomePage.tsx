import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { motion, Variants } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import SEOHead from '../components/SEOHead';

const mainVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } },
};

const HomePage: React.FC = () => {
  const { user, authState } = useAuthStore();

  return (
    <>
      <SEOHead
        title="Dynamic Forms | Create Smart Forms in Seconds"
        description="Create beautiful, intelligent forms in seconds with AI-powered Dynamic Forms. No coding required - just describe what you need and let AI build your perfect form."
        keywords="dynamic forms, AI forms, form builder, online forms, survey builder, form creator, intelligent forms, no-code forms, automated forms"
        ogTitle="Dynamic Forms"
        ogDescription="Create beautiful, intelligent forms in seconds with AI. No coding required - just describe what you need and let AI build your perfect form."
        canonicalUrl="https://forms.orkx.xyz"
      />
      <div className="flex flex-col items-center justify-center text-center min-h-[calc(100vh-12rem)] px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={mainVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-4xl"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter mb-4 sm:mb-6">
            Forms, Reimagined.
          </h1>
          <p className="max-w-2xl mx-auto text-base sm:text-lg md:text-xl text-neutral-600 mb-6 sm:mb-8 px-4">
            Create beautiful, intelligent forms in seconds. Just describe what you need, and let AI do the rest.
          </p>
          
          {authState === 'authenticated' && user ? (
            <Link to="/create">
              <Button size="lg" className="font-bold text-sm sm:text-base px-6 sm:px-8">
                Create a Form
              </Button>
            </Link>
          ) : (
            <div className="space-y-4">
              <Link to="/create">
                <Button size="lg" className="font-bold text-sm sm:text-base px-4 sm:px-8">
                  Try It Free - No Sign Up Required
                </Button>
              </Link>
              <p className="text-xs sm:text-sm text-neutral-500 px-4">
                Create and test forms instantly. Sign up only when you're ready to publish.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
};

export default HomePage;