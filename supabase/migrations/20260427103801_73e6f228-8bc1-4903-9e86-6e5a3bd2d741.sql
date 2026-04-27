-- =========================================================================
-- TERAPILY · WEEK 1 · TUESDAY · SECURITY HARDENING
-- =========================================================================
-- Tighten EXECUTE on SECURITY DEFINER functions (least-privilege).
-- =========================================================================

-- Helper checks: only signed-in users may call them.
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
grant  execute on function public.has_role(uuid, public.app_role) to authenticated;

revoke execute on function public.is_workspace_member(uuid, uuid) from public, anon;
grant  execute on function public.is_workspace_member(uuid, uuid) to authenticated;

revoke execute on function public.has_workspace_role(uuid, uuid, public.workspace_role) from public, anon;
grant  execute on function public.has_workspace_role(uuid, uuid, public.workspace_role) to authenticated;

revoke execute on function public.has_feature(uuid, text) from public, anon;
grant  execute on function public.has_feature(uuid, text) to authenticated;

-- Trigger-only functions: nobody calls them directly.
revoke execute on function public.update_updated_at_column() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
