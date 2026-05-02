-- Revoke from all overloaded variants
DO $$
DECLARE
  fn_oid oid;
BEGIN
  FOR fn_oid IN
    SELECT p.oid FROM pg_proc p
    WHERE p.proname = 'increment_platform_analytics'
      AND p.pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn_oid::regprocedure);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', fn_oid::regprocedure);
  END LOOP;
END $$;