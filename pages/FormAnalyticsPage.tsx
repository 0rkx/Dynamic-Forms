import React from 'react';
import { useIsMobile } from '../lib/utils';
import MobileDesktopRestriction from '../components/MobileDesktopRestriction';

const FormAnalyticsPage: React.FC = () => {
  const isMobile = useIsMobile();

  const analyticsContent = (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Form Analytics</h2>
        <p className="text-gray-600">Analytics page coming soon...</p>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <MobileDesktopRestriction
        title="Form Analytics - Desktop Experience Recommended"
        description="Form analytics with detailed charts and data visualization are optimized for desktop use. For the best experience, we recommend using a desktop or laptop computer."
      >
        {analyticsContent}
      </MobileDesktopRestriction>
    );
  }

  return analyticsContent;
};

export default FormAnalyticsPage;
