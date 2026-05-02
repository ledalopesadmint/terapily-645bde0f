-- Revoke EXECUTE from anon on all SECURITY DEFINER and internal functions
-- These should only be callable by authenticated users, triggers, or service_role

REVOKE EXECUTE ON FUNCTION public.purge_expired_patients() FROM anon;
REVOKE EXECUTE ON FUNCTION public.restore_patient(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_feature(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_workspace_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_workspace_role(uuid, uuid, workspace_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.assert_patient_capacity(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_patient_limit() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_patient_limit_on_restore() FROM anon;
REVOKE EXECUTE ON FUNCTION public.workspace_active_patient_count(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon;

-- Audit trigger functions — only called by triggers (postgres role), never directly
REVOKE EXECUTE ON FUNCTION public.audit_patient_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_subscription_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_patient_activity_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_activity_response_insert() FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_activity_draft_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_activity_consent_insert() FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_scheduled_application_change() FROM anon;

-- NOTE: has_role, is_workspace_member, has_workspace_role are used in RLS policies.
-- RLS evaluates with the calling user's role (authenticated), not anon.
-- Revoking from anon does NOT break RLS for authenticated users.