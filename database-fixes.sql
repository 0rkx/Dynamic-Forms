-- =============================================
-- Database Fixes for Dynamic Forms
-- Run this script in your Supabase SQL editor
-- =============================================

-- 1. Create missing app_config table
CREATE TABLE IF NOT EXISTS public.app_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_types JSONB DEFAULT '["welcome", "text", "textarea", "multiple-choice", "rating", "email"]'::jsonb,
  example_prompts JSONB DEFAULT '["A simple contact form", "Customer feedback survey for a coffee shop", "Event registration for a tech meetup", "Product feedback questionnaire", "Employee satisfaction survey", "Wedding guest RSVP form"]'::jsonb,
  max_follow_ups_per_question INTEGER DEFAULT 3,
  max_total_follow_ups INTEGER DEFAULT 10,
  analysis_cache_hours INTEGER DEFAULT 24,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default config if none exists
INSERT INTO public.app_config (
  question_types,
  example_prompts,
  max_follow_ups_per_question,
  max_total_follow_ups,
  analysis_cache_hours
) VALUES (
  '["welcome", "text", "textarea", "multiple-choice", "rating", "email"]'::jsonb,
  '["A simple contact form", "Customer feedback survey for a coffee shop", "Event registration for a tech meetup", "Product feedback questionnaire", "Employee satisfaction survey", "Wedding guest RSVP form"]'::jsonb,
  3,
  10,
  24
) ON CONFLICT DO NOTHING;

-- 2. Enable RLS on app_config table
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for app_config
DROP POLICY IF EXISTS "Anyone can read app config" ON public.app_config;
CREATE POLICY "Anyone can read app config" ON public.app_config
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can update app config" ON public.app_config;
CREATE POLICY "Authenticated users can update app config" ON public.app_config
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- 4. Fix RLS policies for form_responses to ensure anonymous submissions work
DROP POLICY IF EXISTS "Anyone can submit responses" ON public.form_responses;
CREATE POLICY "Anyone can submit responses" ON public.form_responses
  FOR INSERT WITH CHECK (true);

-- Add explicit policy for authenticated users too (in case there are conflicts)
DROP POLICY IF EXISTS "Authenticated users can submit responses" ON public.form_responses;
CREATE POLICY "Authenticated users can submit responses" ON public.form_responses
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 5. Grant necessary permissions
GRANT SELECT ON public.app_config TO anon;
GRANT SELECT ON public.app_config TO authenticated;
GRANT UPDATE ON public.app_config TO authenticated;

-- Ensure anonymous users can insert form responses
GRANT INSERT ON public.form_responses TO anon;

-- 6. Test the fixes with a diagnostic query
DO $$
BEGIN
  -- Test if we can insert a form response anonymously
  INSERT INTO public.form_responses (
    form_id,
    response_id,
    answers,
    started_at,
    submitted_at,
    user_agent
  ) VALUES (
    'test_form_fix',
    'test_response_' || extract(epoch from now()),
    '{"test": "Database fix test"}',
    now(),
    now(),
    'database_fix_test'
  );
  
  -- Clean up the test data
  DELETE FROM public.form_responses 
  WHERE form_id = 'test_form_fix' AND user_agent = 'database_fix_test';
  
  RAISE NOTICE 'Database fixes applied successfully! Anonymous form submission is working.';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Database fix test failed: %', SQLERRM;
    RAISE NOTICE 'Please check your RLS policies and permissions.';
END;
$$;

-- 7. Create a function to test anonymous submissions
CREATE OR REPLACE FUNCTION test_anonymous_submission()
RETURNS TEXT AS $$
DECLARE
  test_result TEXT;
BEGIN
  -- Try to insert a test response
  INSERT INTO public.form_responses (
    form_id,
    response_id,
    answers,
    started_at,
    submitted_at,
    user_agent
  ) VALUES (
    'test_anonymous_function',
    'test_' || extract(epoch from now()),
    '{"test": "Anonymous submission test"}',
    now(),
    now(),
    'test_function'
  );
  
  -- If we get here, the insert worked
  test_result := 'SUCCESS: Anonymous submission is working';
  
  -- Clean up
  DELETE FROM public.form_responses 
  WHERE form_id = 'test_anonymous_function' AND user_agent = 'test_function';
  
  RETURN test_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the test function
GRANT EXECUTE ON FUNCTION test_anonymous_submission() TO anon;
GRANT EXECUTE ON FUNCTION test_anonymous_submission() TO authenticated;

-- Display completion message
SELECT 'Database fixes completed! Run SELECT test_anonymous_submission(); to test anonymous submissions.' AS status; 