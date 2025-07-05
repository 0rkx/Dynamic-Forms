import React, { useState } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import { Button } from './ui/Button';

interface MobileDesktopRestrictionProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

const MobileDesktopRestriction: React.FC<MobileDesktopRestrictionProps> = ({ 
  children, 
  title = "Desktop Experience Recommended",
  description = "This page is optimized for desktop use. For the best experience, we recommend using a desktop or laptop computer."
}) => {
  const [showAnyway, setShowAnyway] = useState(false);

  if (showAnyway) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <Monitor className="h-16 w-16 text-blue-600" />
            <div className="absolute -bottom-1 -right-1 bg-yellow-400 rounded-full p-1">
              <Smartphone className="h-4 w-4 text-yellow-700" />
            </div>
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {title}
        </h1>
        
        <p className="text-gray-600 mb-8 leading-relaxed">
          {description}
        </p>
        
        <div className="space-y-3">
          <Button 
            onClick={() => setShowAnyway(true)}
            variant="outline"
            className="w-full border-2 border-blue-600 text-blue-600 hover:bg-blue-50"
          >
            Continue Anyway
          </Button>
          
          <p className="text-sm text-gray-500">
            Switch to desktop for the full experience
          </p>
        </div>
      </div>
    </div>
  );
};

export default MobileDesktopRestriction; 