/**
 * Cache utilities for debugging and management
 */

export const clearAnalysisCache = () => {
  const keys = Object.keys(localStorage);
  const cacheKeys = keys.filter(key => 
    key.startsWith('analysis_cache_') || 
    key.startsWith('ai_analysis_')
  );
  
  cacheKeys.forEach(key => {
    localStorage.removeItem(key);
    console.log('Removed cache key:', key);
  });
  
  console.log(`Cleared ${cacheKeys.length} analysis cache entries`);
};

export const listAnalysisCache = () => {
  const keys = Object.keys(localStorage);
  const cacheKeys = keys.filter(key => 
    key.startsWith('analysis_cache_') || 
    key.startsWith('ai_analysis_')
  );
  
  console.log('Analysis cache entries:');
  cacheKeys.forEach(key => {
    try {
      const data = JSON.parse(localStorage.getItem(key) || '{}');
      console.log(`${key}: ${new Date(data.timestamp).toLocaleString()}`);
    } catch (e) {
      console.log(`${key}: invalid data`);
    }
  });
  
  return cacheKeys;
};

export const getCacheStats = () => {
  const keys = Object.keys(localStorage);
  const cacheKeys = keys.filter(key => 
    key.startsWith('analysis_cache_') || 
    key.startsWith('ai_analysis_')
  );
  
  let totalSize = 0;
  cacheKeys.forEach(key => {
    const value = localStorage.getItem(key) || '';
    totalSize += value.length;
  });
  
  return {
    count: cacheKeys.length,
    totalSizeKB: Math.round(totalSize / 1024),
    keys: cacheKeys
  };
};

// Make functions available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).clearAnalysisCache = clearAnalysisCache;
  (window as any).listAnalysisCache = listAnalysisCache;
  (window as any).getCacheStats = getCacheStats;
} 