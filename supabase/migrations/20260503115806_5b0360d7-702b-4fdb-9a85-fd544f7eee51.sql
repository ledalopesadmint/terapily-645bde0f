-- Revoke anon access to ephemeral SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.audit_ephemeral_activity_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_ephemeral_response_insert() FROM anon;
REVOKE EXECUTE ON FUNCTION public.purge_expired_ephemeral_data() FROM anon;