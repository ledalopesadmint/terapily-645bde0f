
-- 1. stripe_events: add RLS policies (table has RLS enabled but no policies)
CREATE POLICY "stripe_events: admin read"
  ON public.stripe_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "stripe_events: deny insert"
  ON public.stripe_events FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "stripe_events: deny update"
  ON public.stripe_events FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "stripe_events: deny delete"
  ON public.stripe_events FOR DELETE
  TO authenticated
  USING (false);

-- 2. Revoke EXECUTE from anon on ALL security definer functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_workspace_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_workspace_role(uuid, uuid, workspace_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_feature(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.workspace_active_patient_count(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.restore_patient(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.purge_expired_patients() FROM anon;
REVOKE EXECUTE ON FUNCTION public.assert_patient_capacity(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_patient_limit() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_patient_limit_on_restore() FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_subscription_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_patient_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_patient_activity_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_activity_response_insert() FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_activity_draft_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_activity_consent_insert() FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_habit_link_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_habit_entry_insert() FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_scheduled_application_change() FROM anon;

-- 3. Revoke EXECUTE from authenticated on trigger/internal-only functions
-- These are ONLY called by triggers or internal pg_cron — never by users directly
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.purge_expired_patients() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_patient_limit() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_patient_limit_on_restore() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.assert_patient_capacity(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_subscription_change() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_patient_change() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_patient_activity_change() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_activity_response_insert() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_activity_draft_change() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_activity_consent_insert() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_habit_link_change() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_habit_entry_insert() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_scheduled_application_change() FROM authenticated;

-- 4. Move pgcrypto to extensions schema (if it exists in public)
-- First check and move
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto' AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    ALTER EXTENSION pgcrypto SET SCHEMA extensions;
  END IF;
END $$;
