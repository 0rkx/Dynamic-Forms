-- =============================================
--      Dynamic Forms - Production-Ready Schema v2
-- =============================================
-- This schema is enhanced for production use, focusing on data integrity,
-- feature completeness, scalability, and edge cases.
--
-- Key Enhancements:
-- - Soft Deletes: Forms can be archived instead of permanently deleted.
-- - Full Profile Sync: Profiles update when auth user info changes.
-- - AI Foundation: Includes `conversation_history` for intelligent follow-ups.
-- - Data Integrity: Uses CHECK constraints to validate JSON structures.
-- - Global Config: An `app_config` table for manageable app settings.
-- - Performance: Includes an analytics cache table.
--
-- Instructions:
-- 1. Reset your database via the Supabase Dashboard (Database -> Reset).
-- 2. After the reset, paste this entire script into the 'SQL Editor' and click 'RUN'.
-- =============================================

-- =============================================
-- APP CONFIGURATION TABLE
-- Stores global settings for the application.
-- =============================================
CREATE TABLE public.app_config (
  id INT PRIMARY KEY,
  question_types JSONB DEFAULT '["text", "textarea", "multiple-choice", "rating", "email", "welcome"]'::jsonb,
  example_prompts JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
COMMENT ON TABLE public.app_config IS 'Stores global application settings, editable from the backend.';
-- RLS for App Config
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read app config" ON public.app_config FOR SELECT USING (true);
-- Note: Updates should be handled by admins via the Supabase dashboard or a secure backend.

-- Insert a single row for configuration.
INSERT INTO public.app_config (id) VALUES (1) ON CONFLICT DO NOTHING;


-- =============================================
-- PROFILES TABLE
-- Manages public user data. Synced with `auth.users`.
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  photo_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE
);
COMMENT ON TABLE public.profiles IS 'Stores public profile information for users, synced with auth.users.';

-- Function to create/update a profile when auth.users changes.
CREATE OR REPLACE FUNCTION public.sync_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, photo_url, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'photo_url',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    photo_url = NEW.raw_user_meta_data->>'photo_url',
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers to sync profile on user creation or update.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_profile();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data OR OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.sync_user_profile();

-- RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);


-- =============================================
-- FORMS TABLE
-- =============================================
CREATE TABLE public.forms (
  id TEXT PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) > 0),
  description TEXT,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(questions) = 'array'),
  settings JSONB DEFAULT '{"intelligent_follow_ups": false, "is_public": true}'::jsonb,
  views INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE -- For soft deletes
);
COMMENT ON TABLE public.forms IS 'Stores the structure, settings, and metadata for each form.';
COMMENT ON COLUMN public.forms.deleted_at IS 'Timestamp for soft deletion. If NULL, the form is active.';
COMMENT ON COLUMN public.forms.questions IS 'A JSON array defining the questions and logic of the form.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_forms_owner_id ON public.forms(owner_id);

-- RLS for forms (with soft delete support)
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own non-deleted forms" ON public.forms
  FOR ALL USING (auth.uid() = owner_id AND deleted_at IS NULL);
CREATE POLICY "Public can view public, non-deleted forms" ON public.forms
  FOR SELECT USING ((settings->>'is_public')::boolean = true AND deleted_at IS NULL);


-- =============================================
-- FORM MANIFESTOS TABLE (For AI Context)
-- =============================================
CREATE TABLE public.form_manifestos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id TEXT NOT NULL UNIQUE REFERENCES public.forms(id) ON DELETE CASCADE,
  product_vision TEXT,
  target_audience TEXT,
  business_goals TEXT[],
  conversation_tone TEXT DEFAULT 'friendly',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
COMMENT ON TABLE public.form_manifestos IS 'Stores the AI''s guiding principles for a form.';
CREATE INDEX IF NOT EXISTS idx_manifestos_form_id ON public.form_manifestos(form_id);

-- RLS for manifestos
ALTER TABLE public.form_manifestos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Form owners can manage their manifestos" ON public.form_manifestos
  FOR ALL USING (form_id IN (SELECT id FROM public.forms WHERE owner_id = auth.uid()));


-- =============================================
-- FORM RESPONSES TABLE
-- =============================================
CREATE TYPE response_status AS ENUM ('in-progress', 'completed');
CREATE TABLE public.form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id TEXT NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  respondent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  answers JSONB NOT NULL CHECK (jsonb_typeof(answers) = 'object'),
  conversation_history JSONB, -- For intelligent follow-ups
  status response_status NOT NULL DEFAULT 'in-progress',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_at TIMESTAMP WITH TIME ZONE, -- Set by trigger on completion
  ip_address INET,
  user_agent TEXT
);
COMMENT ON TABLE public.form_responses IS 'Records every submission for each form.';
COMMENT ON COLUMN public.form_responses.conversation_history IS 'Stores the sequence of questions and answers for AI-driven conversations.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_responses_form_id ON public.form_responses(form_id);
CREATE INDEX IF NOT EXISTS idx_responses_respondent_id ON public.form_responses(respondent_id);

-- RLS for responses
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can create a response" ON public.form_responses FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own in-progress responses" ON public.form_responses
  FOR UPDATE USING (auth.uid() = respondent_id AND status = 'in-progress');
CREATE POLICY "Form owners can view their responses" ON public.form_responses
  FOR SELECT USING (form_id IN (SELECT id FROM public.forms WHERE owner_id = auth.uid()));
CREATE POLICY "Form owners can delete their responses" ON public.form_responses
  FOR DELETE USING (form_id IN (SELECT id FROM public.forms WHERE owner_id = auth.uid()));


-- =============================================
-- RESPONSE ANALYSIS TABLE (AI-Generated Insights)
-- =============================================
CREATE TABLE public.response_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID NOT NULL UNIQUE REFERENCES public.form_responses(id) ON DELETE CASCADE,
    form_id TEXT NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
    key_themes TEXT[],
    emotional_tone TEXT,
    follow_up_potential REAL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
COMMENT ON TABLE public.response_analysis IS 'Stores AI-driven analysis for individual form responses. Inserted via service_role.';
CREATE INDEX IF NOT EXISTS idx_analysis_form_id_response_id ON public.response_analysis(form_id, response_id);

-- RLS for analysis
ALTER TABLE public.response_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Form owners can view their response analysis" ON public.response_analysis
  FOR SELECT USING (form_id IN (SELECT id FROM public.forms WHERE owner_id = auth.uid()));
-- Note: Inserts/updates should be handled by a secure backend service with a service_role key.

-- =============================================
-- ANALYTICS CACHE TABLE
-- =============================================
CREATE TABLE public.analytics_cache (
  cache_key TEXT PRIMARY KEY,
  form_id TEXT NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  cache_data JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
COMMENT ON TABLE public.analytics_cache IS 'Caches aggregated analytics data for performance.';
CREATE INDEX IF NOT EXISTS idx_analytics_cache_form_id ON public.analytics_cache(form_id);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires ON public.analytics_cache(expires_at);

-- RLS for cache
ALTER TABLE public.analytics_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Form owners can read their cache" ON public.analytics_cache
  FOR SELECT USING (form_id IN (SELECT id FROM public.forms WHERE owner_id = auth.uid()));
-- Note: Inserts/updates should be handled by a secure backend service with a service_role key.


-- =============================================
-- TRIGGERS AND FUNCTIONS
-- =============================================

-- Function for a logged-in user to claim an anonymous response
CREATE OR REPLACE FUNCTION public.claim_anonymous_response(response_id_to_claim UUID)
RETURNS void AS $$
-- This function allows a newly authenticated user to associate their ID
-- with a response they started while anonymous.
-- SECURITY: The client is responsible for ensuring the user is claiming
-- their own response (e.g., by retrieving the response_id from secure
-- local storage or a cookie set for the anonymous session).
BEGIN
  UPDATE public.form_responses
  SET respondent_id = auth.uid()
  WHERE id = response_id_to_claim AND respondent_id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Generic function to update the `updated_at` column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to set `submitted_at` when a response is marked as completed
CREATE OR REPLACE FUNCTION public.set_submitted_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    NEW.submitted_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to increment form views securely
CREATE OR REPLACE FUNCTION increment_form_views(form_id_text TEXT)
RETURNS void AS $$
BEGIN
  UPDATE public.forms
  SET views = views + 1
  WHERE id = form_id_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Apply `updated_at` triggers
CREATE TRIGGER update_forms_updated_at BEFORE UPDATE ON public.forms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_manifestos_updated_at BEFORE UPDATE ON public.form_manifestos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Apply `submitted_at` trigger
CREATE TRIGGER set_response_submitted_at BEFORE UPDATE ON public.form_responses FOR EACH ROW EXECUTE FUNCTION public.set_submitted_at();


-- =============================================
-- GRANTS AND PERMISSIONS
-- =============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant limited permissions for anonymous users
GRANT SELECT ON public.app_config TO anon;
GRANT SELECT ON public.forms TO anon;
GRANT INSERT ON public.form_responses TO anon;
GRANT SELECT ON public.profiles TO anon;


-- =============================================
-- FINAL DOCUMENTATION COMMENTS
-- =============================================
COMMENT ON FUNCTION public.sync_user_profile() IS 'Trigger function to sync auth.users with public.profiles on insert or update.';
COMMENT ON FUNCTION public.update_updated_at_column() IS 'Generic trigger to keep `updated_at` current on row updates.';
COMMENT ON FUNCTION public.set_submitted_at() IS 'Trigger to timestamp a response upon completion.';
COMMENT ON FUNCTION public.increment_form_views(TEXT) IS 'Securely increments the view counter for a form, bypassing RLS.';
COMMENT ON FUNCTION public.claim_anonymous_response(UUID) IS 'Allows a newly logged-in user to claim a response started anonymously.';