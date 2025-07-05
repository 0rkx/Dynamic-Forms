import React from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  noIndex?: boolean;
  canonicalUrl?: string;
}

const SEOHead: React.FC<SEOHeadProps> = ({
  title = 'Dynamic Forms | Create Smart Forms in Seconds',
  description = 'Create beautiful, intelligent forms in seconds with AI-powered Dynamic Forms. No coding required - just describe what you need and let AI build your perfect form.',
  keywords = 'dynamic forms, AI forms, form builder, online forms, survey builder, form creator, intelligent forms, no-code forms, automated forms',
  ogTitle,
  ogDescription,
  ogImage = 'https://forms.orkx.xyz/og-image.jpg',
  ogUrl = 'https://forms.orkx.xyz',
  twitterTitle,
  twitterDescription,
  twitterImage,
  noIndex = false,
  canonicalUrl
}) => {
  React.useEffect(() => {
    // Update document title
    document.title = title;

    // Update meta tags
    const updateMetaTag = (name: string, content: string, property = false) => {
      const attr = property ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attr}="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Basic meta tags
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords);
    updateMetaTag('robots', noIndex ? 'noindex, nofollow' : 'index, follow');

    // Open Graph tags
    updateMetaTag('og:title', ogTitle || title, true);
    updateMetaTag('og:description', ogDescription || description, true);
    updateMetaTag('og:image', ogImage, true);
    updateMetaTag('og:url', ogUrl, true);
    updateMetaTag('og:type', 'website', true);

    // Twitter Card tags
    updateMetaTag('twitter:title', twitterTitle || title);
    updateMetaTag('twitter:description', twitterDescription || description);
    updateMetaTag('twitter:image', twitterImage || ogImage);
    updateMetaTag('twitter:card', 'summary_large_image');

    // Canonical URL
    if (canonicalUrl) {
      let canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
      }
      canonical.setAttribute('href', canonicalUrl);
    }
  }, [title, description, keywords, ogTitle, ogDescription, ogImage, ogUrl, twitterTitle, twitterDescription, twitterImage, noIndex, canonicalUrl]);

  return null;
};

export default SEOHead; 