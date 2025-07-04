// OAuth Configuration Checker
// Run this script to verify your Google OAuth setup

const checkOAuthConfig = () => {
  console.log('🔍 Checking OAuth Configuration...\n');
  
  // Check environment variables
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  
  console.log('📋 Environment Variables:');
  console.log('VITE_SUPABASE_URL:', supabaseUrl || '❌ Not set');
  console.log('VITE_GOOGLE_CLIENT_ID:', googleClientId || '❌ Not set');
  console.log('');
  
  // Extract project ID from Supabase URL
  if (supabaseUrl) {
    const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    console.log('📍 Supabase Project ID:', projectId || '❌ Could not extract');
    
    if (projectId) {
      const redirectUri = `https://${projectId}.supabase.co/auth/v1/callback`;
      console.log('🔗 Required Redirect URI for Google Cloud Console:');
      console.log('   ', redirectUri);
      console.log('');
      
      console.log('✅ Copy this redirect URI to your Google Cloud Console:');
      console.log('   1. Go to https://console.cloud.google.com/');
      console.log('   2. Select your project');
      console.log('   3. Go to APIs & Services > Credentials');
      console.log('   4. Edit your OAuth 2.0 Client ID');
      console.log('   5. Add this URI to "Authorized redirect URIs":');
      console.log('      ', redirectUri);
      console.log('   6. Save the changes');
      console.log('');
    }
  }
  
  // Check current page URL
  console.log('🌐 Current Configuration:');
  console.log('Origin:', window.location.origin);
  console.log('Current URL:', window.location.href);
  console.log('');
  
  // Provide troubleshooting tips
  console.log('🛠️ Troubleshooting Tips:');
  console.log('1. Make sure the redirect URI in Google Cloud Console matches EXACTLY');
  console.log('2. Wait 2-3 minutes after making changes in Google Cloud Console');
  console.log('3. Clear browser cache and cookies');
  console.log('4. Try incognito/private browsing mode');
  console.log('5. Check that Google OAuth is enabled in Supabase Dashboard');
  console.log('');
  
  if (!googleClientId) {
    console.log('⚠️  Warning: VITE_GOOGLE_CLIENT_ID is not set');
    console.log('   Add this to your .env file:');
    console.log('   VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com');
    console.log('');
  }
};

// Auto-run if this script is executed directly
if (typeof window !== 'undefined') {
  checkOAuthConfig();
}

export { checkOAuthConfig }; 