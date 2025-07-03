# Supabase Setup Guide

## 1. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Create a new account or sign in
3. Create a new project
4. Choose a project name, database password, and region
5. Wait for the project to be created (usually takes 1-2 minutes)

## 2. Get Your Supabase Credentials

Once your project is ready:

1. Go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://your-project-id.supabase.co`)
   - **Project API Keys** → **anon/public** (the public key)

## 3. Create Environment Variables

Create a `.env` file in the root directory with the following content:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here

# Gemini AI Configuration (existing)
GEMINI_API_KEY=your-gemini-api-key-here
```

**Important**: Replace the placeholder values with your actual Supabase credentials from step 2.

## 4. Database Schema Setup

The database schema will be created automatically during the migration process. You can also manually create it by running the SQL commands in the database schema section of the migration plan.

## 5. Test Connection

Once you've set up the environment variables, restart your development server:

```bash
npm run dev
```

The application should now be able to connect to Supabase (you'll see connection errors in the console if the credentials are incorrect).

## Next Steps

After completing this setup, the migration process will continue with:
1. Database schema creation
2. Authentication service implementation
3. Data migration from localStorage
4. Frontend integration

## Troubleshooting

- **Connection errors**: Double-check your environment variables
- **Project not found**: Ensure the project URL is correct
- **Authentication errors**: Verify the anon key is correct
- **CORS errors**: Make sure your domain is added to the allowed origins in Supabase settings 