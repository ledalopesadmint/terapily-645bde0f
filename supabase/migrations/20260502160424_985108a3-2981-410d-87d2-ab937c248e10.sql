-- Revoke from PUBLIC role (anon inherits from public)
REVOKE EXECUTE ON FUNCTION public.assert_patient_capacity(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_activity_consent_insert() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_activity_draft_change() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_activity_response_insert() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_patient_activity_change() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_patient_change() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_scheduled_application_change() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_patient_limit_on_restore() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.workspace_active_patient_count(uuid) FROM PUBLIC;

-- Grant back to authenticated where needed (RLS helper + direct RPC calls)
GRANT EXECUTE ON FUNCTION public.workspace_active_patient_count(uuid) TO authenticated;
-- assert_patient_capacity is called only by triggers/restore_patient, no direct grant needed
-- audit_* are trigger-only, no direct grant needed
-- enforce_patient_limit_on_restore is trigger-only, no direct grant needed