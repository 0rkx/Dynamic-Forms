# Database Setup Guide

## Quick Setup Steps

1. **Open Supabase Dashboard**
   - Go to [app.supabase.com](https://app.supabase.com)
   - Navigate to your project
   - Click on "SQL Editor" in the sidebar

2. **Run the Schema**
   - Copy the entire contents of `supabase-schema.sql`
   - Paste it into the SQL Editor
   - Click "Run" button

3. **Verify Setup**
   The script will create:
   - ✅ 3 tables: `forms`, `form_responses`, `analytics_cache`
   - ✅ Proper indexes for performance
   - ✅ Row Level Security (RLS) policies
   - ✅ Utility functions and triggers
   - ✅ User profiles view

## ⚠️ Safe to Run Multiple Times

The schema is now **idempotent** - you can run it multiple times without errors. It will:
- Drop existing policies/triggers/views first
- Then recreate them with current definitions
- Skip table creation if tables already exist

## After Running Schema

1. **Test Database Connection**
   ```bash
   # Make sure your .env file has:
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Test Authentication**
   - Try signing up with a new account
   - Check email for confirmation link
   - Test login/logout flows

## Troubleshooting

- **Connection errors**: Check environment variables
- **Policy errors**: Re-run the complete schema
- **Permission errors**: Verify you're the project owner

---

✅ **Schema is production-ready with proper security and performance optimizations!** 