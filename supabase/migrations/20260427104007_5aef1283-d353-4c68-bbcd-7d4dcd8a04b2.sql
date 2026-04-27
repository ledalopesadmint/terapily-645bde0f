-- =========================================================================
-- TERAPILY · WEEK 1 · TUESDAY · WORKSPACE ROLE ADJUSTMENT
-- =========================================================================
-- workspace_role: owner | supervisor | member  →  owner | therapist | supervisor
-- Reason: keep workspace roles aligned with real clinical function.
-- =========================================================================

-- 1. Drop dependent default + policies that reference workspace_role
alter table public.workspace_members      alter column role drop default;
alter table public.workspace_invitations  alter column role drop default;

-- Drop policies that use has_workspace_role(...) so we can recreate the function/enum.
drop policy if exists "workspaces: owner update"               on public.workspaces;
drop policy if exists "workspace_members: owner manage"        on public.workspace_members;
drop policy if exists "invitations: owner manage"              on public.workspace_invitations;
drop policy if exists "subscriptions: owner update"            on public.subscriptions;
drop policy if exists "feature_flags: owner manage"            on public.feature_flags;
drop policy if exists "audit_logs: workspace owner read"       on public.audit_logs;

-- Drop the function (it depends on the enum signature).
drop function if exists public.has_workspace_role(uuid, uuid, public.workspace_role);

-- 2. Rename old enum and create the new one
alter type public.workspace_role rename to workspace_role__old;

create type public.workspace_role as enum ('owner', 'therapist', 'supervisor');

-- 3. Convert the columns: any existing 'member' becomes 'therapist'
alter table public.workspace_members
  alter column role type public.workspace_role
  using (
    case role::text
      when 'member' then 'therapist'
      else role::text
    end
  )::public.workspace_role;

alter table public.workspace_invitations
  alter column role type public.workspace_role
  using (
    case role::text
      when 'member' then 'therapist'
      else role::text
    end
  )::public.workspace_role;

-- 4. Restore defaults (now: 'therapist')
alter table public.workspace_members
  alter column role set default 'therapist'::public.workspace_role;

alter table public.workspace_invitations
  alter column role set default 'therapist'::public.workspace_role;

-- 5. Drop old enum
drop type public.workspace_role__old;

-- 6. Recreate has_workspace_role() with the new enum signature
create or replace function public.has_workspace_role(
  _workspace_id uuid,
  _user_id uuid,
  _role public.workspace_role
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = _workspace_id
      and user_id = _user_id
      and role = _role
      and deleted_at is null
  );
$$;

-- Re-apply EXECUTE hardening
revoke execute on function public.has_workspace_role(uuid, uuid, public.workspace_role) from public, anon;
grant  execute on function public.has_workspace_role(uuid, uuid, public.workspace_role) to authenticated;

-- 7. Recreate the policies that referenced the function
create policy "workspaces: owner update"
on public.workspaces for update to authenticated
using (public.has_workspace_role(id, auth.uid(), 'owner'))
with check (public.has_workspace_role(id, auth.uid(), 'owner'));

create policy "workspace_members: owner manage"
on public.workspace_members for all to authenticated
using (public.has_workspace_role(workspace_id, auth.uid(), 'owner'))
with check (public.has_workspace_role(workspace_id, auth.uid(), 'owner'));

create policy "invitations: owner manage"
on public.workspace_invitations for all to authenticated
using (public.has_workspace_role(workspace_id, auth.uid(), 'owner'))
with check (public.has_workspace_role(workspace_id, auth.uid(), 'owner'));

create policy "subscriptions: owner update"
on public.subscriptions for update to authenticated
using (public.has_workspace_role(workspace_id, auth.uid(), 'owner'))
with check (public.has_workspace_role(workspace_id, auth.uid(), 'owner'));

create policy "feature_flags: owner manage"
on public.feature_flags for all to authenticated
using (public.has_workspace_role(workspace_id, auth.uid(), 'owner'))
with check (public.has_workspace_role(workspace_id, auth.uid(), 'owner'));

create policy "audit_logs: workspace owner read"
on public.audit_logs for select to authenticated
using (
  workspace_id is not null
  and public.has_workspace_role(workspace_id, auth.uid(), 'owner')
);

-- 8. handle_new_user() already inserts the new user as 'owner' — no change needed.
--    (Verified: the function literal 'owner' is valid in the new enum.)
