# Manual SQL Fix for Analytics Cache RLS Policies

The background analysis is failing because the `analytics_cache` table is missing INSERT and UPDATE RLS policies.

## Steps to Fix:

1. Go to your Supabase Dashboard
2. Navigate to: **SQL Editor**
3. Create a new query and paste the following SQL:

```sql
-- Fix RLS policies for analytics_cache table
-- This adds INSERT and UPDATE policies so users can manage their own cache entries

-- Add INSERT policy for analytics_cache
DROP POLICY IF EXISTS "Form owners can insert their cache" ON public.analytics_cache;
CREATE POLICY "Form owners can insert their cache" ON public.analytics_cache
  FOR INSERT WITH CHECK (form_id IN (SELECT id FROM public.forms WHERE owner_id = auth.uid()));

-- Add UPDATE policy for analytics_cache  
DROP POLICY IF EXISTS "Form owners can update their cache" ON public.analytics_cache;
CREATE POLICY "Form owners can update their cache" ON public.analytics_cache
  FOR UPDATE USING (form_id IN (SELECT id FROM public.forms WHERE owner_id = auth.uid()));

-- Add DELETE policy for analytics_cache (for cleanup)
DROP POLICY IF EXISTS "Form owners can delete their cache" ON public.analytics_cache;
CREATE POLICY "Form owners can delete their cache" ON public.analytics_cache
  FOR DELETE USING (form_id IN (SELECT id FROM public.forms WHERE owner_id = auth.uid()));
```

4. Click **RUN** to execute the SQL
5. The background analysis should now work properly

## What This Fixes:

- **403 Forbidden** errors when trying to write to analytics_cache
- **Row-level security policy violations** 
- Background analysis will now be able to cache results properly

## Alternative: Disable Caching Temporarily

If you can't run the SQL right now, the system will continue to work without caching - it will just be slower as it won't cache analysis results. 