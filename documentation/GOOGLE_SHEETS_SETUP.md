# Google Sheets Export Setup Guide

This guide explains how to set up Google Sheets export functionality for the Dynamic Forms application.

## 🚨 Quick Fix for "Not a valid origin" Error

If you're seeing this error: `Not a valid origin for the client: http://127.0.0.1:5173`

**Immediate Solution:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Click on your **OAuth 2.0 Client ID**
4. In the **Authorized JavaScript origins** section, add these URIs:
   ```
   http://localhost:5173
   http://127.0.0.1:5173
   https://localhost:5173
   https://127.0.0.1:5173
   ```
5. Click **Save**
6. Wait 2-3 minutes for changes to propagate
7. Try the export again

## Prerequisites

1. Google Cloud Platform account
2. A project in Google Cloud Console

## Step-by-Step Setup

### 1. Enable Google Sheets API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** > **Library**
4. Search for "Google Sheets API"
5. Click on it and press **Enable**

### 2. Create Credentials

#### Create API Key
1. Go to **APIs & Services** > **Credentials**
2. Click **+ CREATE CREDENTIALS** > **API key**
3. Copy the generated API key
4. Click **Restrict Key** to configure restrictions (recommended)
5. Under **API restrictions**, select **Restrict key** and choose **Google Sheets API**
6. Under **Website restrictions**, add your domains (optional but recommended for production)

#### Create OAuth 2.0 Client ID
1. In **APIs & Services** > **Credentials**
2. Click **+ CREATE CREDENTIALS** > **OAuth client ID**
3. **If prompted, configure OAuth consent screen first** (this is critical):

##### OAuth Consent Screen Configuration (CRITICAL STEP)
   **Step 1: OAuth Consent Screen Basics**
   - Choose **External** user type (unless you have Google Workspace)
   - **App name**: Enter your app name (e.g., "Dynamic Forms")
   - **User support email**: Your email address
   - **App logo**: Optional but recommended
   - **App domain**: Your domain (optional for development)
   - **Developer contact information**: Your email address
   - Click **Save and Continue**

   **Step 2: Scopes**
   - Click **Add or Remove Scopes**
   - Search for "sheets" and add: `https://www.googleapis.com/auth/spreadsheets`
   - You should see it in the "Your non-sensitive scopes" section
   - Click **Update** and then **Save and Continue**

   **Step 3: Test Users (for External apps)**
   - Add your email address to test users
   - Add any other emails that need to test the app
   - Click **Save and Continue**

   **Step 4: Summary**
   - Review all settings
   - Click **Back to Dashboard**

4. **Now create the OAuth client ID**:
   - Back in **Credentials**, click **+ CREATE CREDENTIALS** > **OAuth client ID**
   - Select **Web application** as the application type
   - Give it a name (e.g., "Dynamic Forms - Google Sheets Export")
   - **IMPORTANT**: Add Authorized JavaScript origins:
     - `http://localhost:5173` (for development)
     - `http://127.0.0.1:5173` (for development)
     - `https://localhost:5173` (if using HTTPS locally)
     - `https://127.0.0.1:5173` (if using HTTPS locally)
     - Your production domain (e.g., `https://yourdomain.com`)
   - Click **Create**
   - Copy the **Client ID** (you don't need the Client Secret for this setup)

### 3. Configure Environment Variables

Add the following to your `.env` file:

```env
VITE_GOOGLE_CLIENT_ID=your_client_id_here
VITE_GOOGLE_API_KEY=your_api_key_here
```

### 4. Common Issues and Solutions

#### Origin Not Authorized Error

**Error**: `Not a valid origin for the client: http://127.0.0.1:5173`

**Solution**:
1. Go to Google Cloud Console > APIs & Services > Credentials
2. Click on your OAuth 2.0 Client ID
3. Under "Authorized JavaScript origins", add:
   - `http://localhost:5173`
   - `http://127.0.0.1:5173` 
   - `https://localhost:5173`
   - `https://127.0.0.1:5173`
4. Save the changes
5. Wait a few minutes for changes to propagate
6. Try the export again

#### API Key Issues

**Error**: `Invalid Google API key`

**Solutions**:
1. Check that the API key is correctly set in your `.env` file
2. Ensure Google Sheets API is enabled for your project
3. Verify API key restrictions (if any) allow your domain
4. Regenerate the API key if necessary

#### OAuth Configuration Issues

**Error**: `Invalid client configuration` or `gapi.client.init failed with "Unknown error"`

**Root Cause**: Usually OAuth consent screen misconfiguration

**Step-by-Step Fix**:

1. **Check OAuth Consent Screen Status**:
   - Go to **APIs & Services** > **OAuth consent screen**
   - Status should show "In production" or "Testing" (not "Needs verification")
   - If it shows "Needs verification", you may need to add test users

2. **Verify Required Scopes**:
   - In OAuth consent screen, go to **Scopes** tab
   - Must include: `https://www.googleapis.com/auth/spreadsheets`
   - If missing, click **Edit App** → **Scopes** → **Add or Remove Scopes**

3. **Check Test Users (for External apps)**:
   - In OAuth consent screen, go to **Test users** tab
   - Add your email address and any other testing emails
   - External apps are limited to 100 test users until published

4. **Verify Client ID Configuration**:
   - Go to **Credentials** tab
   - Click on your OAuth 2.0 Client ID
   - Ensure **Application type** is "Web application"
   - Verify **Authorized JavaScript origins** includes your current origin

5. **Common OAuth Consent Screen Errors**:
   - **"App domain not verified"**: Add your domain or remove it for development
   - **"Scopes not configured"**: Add the required spreadsheets scope
   - **"Test user not added"**: Add your email to test users for external apps
   - **"App not approved"**: Submit for verification or keep in testing mode

### 5. Testing the Setup

1. Start your development server (`npm run dev`)
2. Navigate to the admin panel
3. Go to the Responses tab
4. Click "Export to Google Sheets"
5. You should see the Google authentication popup
6. Grant the necessary permissions
7. The export should complete successfully

### 6. Production Considerations

1. **Security**: Restrict your API key to only necessary APIs and domains
2. **OAuth Consent**: Complete the OAuth consent screen configuration
3. **Domain Verification**: Verify ownership of your production domain
4. **HTTPS**: Always use HTTPS in production
5. **Environment Variables**: Keep your credentials secure and never commit them to version control

### 7. Troubleshooting

#### Enable Debugging
The application includes detailed logging. Check the browser console for specific error messages.

#### Verify Discovery Document Loading
1. Open **DevTools** → **Network** tab
2. Try the Google Sheets export
3. Look for a request to `https://sheets.googleapis.com/$discovery/rest?version=v4`
   - **200 OK**: Good, API is accessible
   - **403/404**: API key not enabled for Sheets or wrong referrer restrictions
   - **CORS blocked**: Script loading issue, check gapi script URL

#### Common Error Messages

- **"gapi.client.init failed with Unknown error"**: Most common causes:
  1. Missing/invalid API key or Client ID
  2. Google Sheets API not enabled
  3. Unauthorized JavaScript origin
  4. Missing `plugin_name` parameter
- **"Authentication popup was closed"**: User cancelled the authentication process
- **"Google API failed to load"**: Network or script loading issue
- **"Origin not authorized"**: Most common issue - add your origin to authorized JavaScript origins
- **"idpiframe_initialization_failed"**: Google Identity Services initialization failed, usually due to OAuth configuration

#### Still Having Issues?

1. **Check the Network tab** for failed requests to Google APIs
2. **Clear browser cache and cookies** completely
3. **Try in an incognito/private browsing window**
4. **Verify environment variables** are correctly set (check browser DevTools → Application → Local Storage)
5. **Ensure APIs are enabled** in Google Cloud Console (both Google Sheets API and Google Identity Services)
6. **Wait 5-10 minutes** after making changes in Google Cloud Console for propagation
7. **Check API quotas** in Google Cloud Console if getting rate limit errors

## Security Notes

- Never expose your API key or Client ID in client-side code for production
- Consider implementing server-side authentication for production applications
- Regularly rotate your API keys
- Monitor API usage in Google Cloud Console
- Set up proper access controls and restrictions

## Limitations

- Users must authenticate with Google to export data
- Exports are limited by Google Sheets API quotas
- Large datasets may require pagination (not currently implemented)
- Network connectivity is required for all operations

## Features

The Google Sheets export includes:
- All form responses with proper formatting
- Follow-up questions are included with clear labeling
- Automatic header formatting (bold, gray background)
- Auto-resized columns for better readability
- Direct link to open the created spreadsheet
- Timestamps in readable format

## API Limits

Be aware of Google Sheets API limits:
- 100 requests per 100 seconds per user
- 300 requests per 100 seconds
- 10,000 requests per 100 seconds per project

For high-volume applications, consider implementing:
- Request batching
- Rate limiting
- Caching strategies
- User notification of limits 