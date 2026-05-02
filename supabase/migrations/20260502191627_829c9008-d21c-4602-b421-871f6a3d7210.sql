
-- Revoke anon execution on the two new SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.audit_habit_link_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_habit_entry_insert() FROM anon;
