-- Production RLS and RPC fixes for Dynamic Forms.

-- Public visitors need manifesto context for public shared forms, but writes
-- stay owner-only through existing policies.
DROP POLICY IF EXISTS "Public can view public manifestos" ON public.form_manifestos;
CREATE POLICY "Public can view public manifestos" ON public.form_manifestos
  FOR SELECT USING (
    form_id IN (
      SELECT id
      FROM public.forms
      WHERE (settings->>'is_public')::boolean = true
        AND deleted_at IS NULL
    )
  );

GRANT SELECT ON public.form_manifestos TO anon;

DROP POLICY IF EXISTS "Public can view public manifesto context" ON public.user_manifesto_context;
CREATE POLICY "Public can view public manifesto context" ON public.user_manifesto_context
  FOR SELECT USING (
    form_id IN (
      SELECT id
      FROM public.forms
      WHERE (settings->>'is_public')::boolean = true
        AND deleted_at IS NULL
    )
  );

GRANT SELECT ON public.user_manifesto_context TO anon;

-- The analytics cache is written by authenticated form owners from the client.
DROP POLICY IF EXISTS "Form owners can insert their cache" ON public.analytics_cache;
CREATE POLICY "Form owners can insert their cache" ON public.analytics_cache
  FOR INSERT WITH CHECK (form_id IN (SELECT id FROM public.forms WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Form owners can update their cache" ON public.analytics_cache;
CREATE POLICY "Form owners can update their cache" ON public.analytics_cache
  FOR UPDATE USING (form_id IN (SELECT id FROM public.forms WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Form owners can delete their cache" ON public.analytics_cache;
CREATE POLICY "Form owners can delete their cache" ON public.analytics_cache
  FOR DELETE USING (form_id IN (SELECT id FROM public.forms WHERE owner_id = auth.uid()));

-- Match the frontend RPC argument name: supabase.rpc('increment_form_views', { form_id: ... }).
DROP FUNCTION IF EXISTS public.increment_form_views(TEXT);

CREATE OR REPLACE FUNCTION public.increment_form_views(form_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE public.forms
  SET views = views + 1
  WHERE id = form_id
    AND (settings->>'is_public')::boolean = true
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.increment_form_views(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_form_views(TEXT) TO anon, authenticated;

COMMENT ON FUNCTION public.increment_form_views(TEXT) IS 'Increments public form view counters while bypassing RLS for this narrow update.';
