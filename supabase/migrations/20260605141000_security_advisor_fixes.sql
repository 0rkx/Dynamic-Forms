-- Follow-up fixes from Supabase security advisors.

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.set_submitted_at()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    NEW.submitted_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger-only function. It should not be callable through the Data API.
REVOKE ALL ON FUNCTION public.sync_user_profile() FROM PUBLIC, anon, authenticated;

-- Not used by the current frontend. Keep closed unless a secure claim flow is added.
REVOKE ALL ON FUNCTION public.claim_anonymous_response(UUID) FROM PUBLIC, anon, authenticated;

-- Anonymous submissions are allowed only for active public forms.
DROP POLICY IF EXISTS "Anyone can create a response" ON public.form_responses;
CREATE POLICY "Anyone can create a response" ON public.form_responses
  FOR INSERT WITH CHECK (
    form_id IN (
      SELECT id
      FROM public.forms
      WHERE (settings->>'is_public')::boolean = true
        AND deleted_at IS NULL
    )
  );
