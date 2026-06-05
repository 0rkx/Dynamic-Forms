# Google OAuth Setup Guide

This guide will help you set up Google OAuth authentication in your Supabase project.

## Prerequisites

1. A Supabase project
2. A Google Cloud Platform account

## Step 1: Create Google OAuth Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API (if not already enabled)
4. Go to "Credentials" in the left sidebar
5. Click "Create Credentials" > "OAuth client ID"
6. Select "Web application"
7. Add your authorized redirect URIs:
   - For your Supabase project: `https://fphovkacnxhvdybjwvsb.supabase.co/auth/v1/callback`
   - For production (if different): `https://your-domain.com/auth/v1/callback`
8. Copy the Client ID and Client Secret

## Step 2: Configure Supabase

1. Go to your Supabase dashboard
2. Navigate to Authentication > Providers
3. Find Google and click "Enable"
4. Enter your Google Client ID and Client Secret
5. Save the configuration

## Step 3: Configure Your Application

1. Make sure your `.env` file has the following variables:
   ```
   VITE_SUPABASE_URL=https://fphovkacnxhvdybjwvsb.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   ```

2. The Google OAuth buttons have already been added to your login and register forms

## Step 4: Testing

1. Start your development server
2. Navigate to the login page
3. Click "Continue with Google"
4. Complete the OAuth flow
5. You should be redirected back to your app and logged in

## Troubleshooting

### Error 400: redirect_uri_mismatch

**Problem**: Getting "redirect_uri_mismatch" error when trying to sign in with Google.

**Solution**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to APIs & Services > Credentials
4. Edit your OAuth 2.0 Client ID
5. In "Authorized redirect URIs", add exactly this URI:
   ```
   https://fphovkacnxhvdybjwvsb.supabase.co/auth/v1/callback
   ```
6. Click Save
7. Wait 2-3 minutes for changes to propagate
8. Try again

### Common Issues

1. **"Invalid redirect URI"**: Make sure your redirect URI in Google Cloud Console matches exactly what Supabase expects
2. **"OAuth client not found"**: Double-check your Client ID and Client Secret in Supabase
3. **Users not being created**: Check your Supabase Row Level Security (RLS) policies
4. **Changes not taking effect**: Wait 2-3 minutes after making changes in Google Cloud Console

### Quick Configuration Check

Run this in your browser console to verify your setup:
```javascript
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Google Client ID:', import.meta.env.VITE_GOOGLE_CLIENT_ID);
```

### Redirect URI Format

The redirect URI should be:
```
https://fphovkacnxhvdybjwvsb.supabase.co/auth/v1/callback
```

⚠️ **Important**: This URI must match EXACTLY in Google Cloud Console.

## Environment Variables

The application uses the same Google Client ID for both Google Sheets integration and OAuth authentication. Make sure you have:

```
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

## Security Notes

1. Never expose your Client Secret in client-side code
2. Always use HTTPS in production
3. Regularly rotate your OAuth credentials
4. Monitor your Google Cloud Console for any suspicious activity

## Next Steps

Once Google OAuth is working, you can:
1. Customize the user profile data stored during OAuth signup
2. Add additional OAuth providers (GitHub, Facebook, etc.)
3. Set up user roles and permissions
4. Configure email templates for OAuth users 
