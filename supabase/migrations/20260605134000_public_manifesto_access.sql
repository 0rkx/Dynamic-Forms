-- =============================================
-- Public Manifesto & Context Access Patch
-- =============================================
-- This script relaxes Row-Level Security so that anonymous users
-- (public visitors filling out a shared form) can read the existing
-- manifesto and dual-context data WHEN the parent form itself is public.
-- It keeps full owner-only write privileges.
-- -------------------------------------------------------------
-- Usage: Run in Supabase SQL editor or psql after deploying schema.
-- -------------------------------------------------------------

-- FORM_MANIFESTOS -------------------------------------------------

-- 1. Allow SELECT for manifestos that belong to public, non-deleted forms.
DROP POLICY IF EXISTS "Public can view public manifestos" ON public.form_manifestos;
CREATE POLICY "Public can view public manifestos" ON public.form_manifestos
  FOR SELECT USING (
    form_id IN (
      SELECT id FROM public.forms
      WHERE (settings->>'is_public')::boolean = true
        AND deleted_at IS NULL
    )
  );

-- 2. Grant the anon role read access (needed in addition to policy).
GRANT SELECT ON public.form_manifestos TO anon;

-- USER_MANIFESTO_CONTEXT -----------------------------------------

-- 3. Allow SELECT for user_manifesto_context rows tied to public forms.
DROP POLICY IF EXISTS "Public can view public manifesto context" ON public.user_manifesto_context;
CREATE POLICY "Public can view public manifesto context" ON public.user_manifesto_context
  FOR SELECT USING (
    form_id IN (
      SELECT id FROM public.forms
      WHERE (settings->>'is_public')::boolean = true
        AND deleted_at IS NULL
    )
  );

-- 4. Grant anon read access to the context table as well.
GRANT SELECT ON public.user_manifesto_context TO anon;

-- Done.
