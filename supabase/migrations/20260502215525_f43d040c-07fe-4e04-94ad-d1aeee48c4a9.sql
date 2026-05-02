-- Revoke EXECUTE from anon on ALL public SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.assert_patient_capacity(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_activity_consent_insert() FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_activity_draft_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_activity_response_insert() FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_habit_entry_insert() FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_habit_link_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_patient_activity_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_patient_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_scheduled_application_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_subscription_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_patient_limit() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_patient_limit_on_restore() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_feature(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_workspace_role(uuid, uuid, workspace_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_platform_analytics(date, smallint, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_workspace_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.purge_expired_patients() FROM anon;
REVOKE EXECUTE ON FUNCTION public.restore_patient(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.workspace_active_patient_count(uuid) FROM anon;

-- Revoke EXECUTE from authenticated on trigger-only/internal functions
REVOKE EXECUTE ON FUNCTION public.audit_activity_consent_insert() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_activity_draft_change() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_activity_response_insert() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_habit_entry_insert() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_habit_link_change() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_patient_activity_change() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_patient_change() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_scheduled_application_change() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_subscription_change() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_patient_limit() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_patient_limit_on_restore() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_platform_analytics(date, smallint, text, text) FROM authenticated;