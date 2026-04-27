-- =========================================================================
-- TERAPILY · WEEK 1 · TUESDAY · DATABASE FOUNDATION
-- =========================================================================
-- profiles, roles (global + workspace), workspaces, members, invitations,
-- subscriptions (provider-agnostic), feature_flags, audit_logs,
-- atomic handle_new_user trigger.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 0. EXTENSIONS & SHARED HELPERS
-- -------------------------------------------------------------------------

create extension if not exists "pgcrypto";

-- Generic updated_at trigger (reused everywhere)
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -------------------------------------------------------------------------
-- 1. ENUMS
-- -------------------------------------------------------------------------

-- Global app roles (system-wide capability)
do $$ begin
  create type public.app_role as enum ('admin', 'therapist', 'patient');
exception when duplicate_object then null; end $$;

-- Per-workspace roles (membership capability inside a workspace)
do $$ begin
  create type public.workspace_role as enum ('owner', 'supervisor', 'member');
exception when duplicate_object then null; end $$;

-- Subscription tiers
do $$ begin
  create type public.subscription_tier as enum ('solo', 'practice', 'clinic');
exception when duplicate_object then null; end $$;

-- Subscription status
do $$ begin
  create type public.subscription_status as enum (
    'trialing', 'active', 'past_due', 'canceled', 'incomplete', 'paused'
  );
exception when duplicate_object then null; end $$;

-- Invitation status
do $$ begin
  create type public.invitation_status as enum (
    'pending', 'accepted', 'revoked', 'expired'
  );
exception when duplicate_object then null; end $$;

-- -------------------------------------------------------------------------
-- 2. PROFILES
-- -------------------------------------------------------------------------
-- profiles.id == auth.users.id (1:1). Documented contract.
-- No FK to auth.users (Supabase best practice: keep public schema decoupled).

create table public.profiles (
  id            uuid primary key,
  full_name     text,
  avatar_url    text,
  country       text,            -- optional (ISO-3166-1 alpha-2 e.g. 'US', 'BR')
  license_number text,           -- optional
  npi           text,            -- optional (US National Provider Identifier)
  locale        text not null default 'pt-BR',
  timezone      text not null default 'America/Sao_Paulo',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

alter table public.profiles enable row level security;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.update_updated_at_column();

-- -------------------------------------------------------------------------
-- 3. USER_ROLES (global) + has_role()
-- -------------------------------------------------------------------------

create table public.user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  role       public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create index idx_user_roles_user_id on public.user_roles(user_id);

alter table public.user_roles enable row level security;

-- SECURITY DEFINER: avoids recursive RLS when policies need to check roles.
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

-- -------------------------------------------------------------------------
-- 4. WORKSPACES + MEMBERS + has_workspace_role()
-- -------------------------------------------------------------------------

create table public.workspaces (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text not null unique,
  trial_ends_at   timestamptz not null default (now() + interval '14 days'),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

alter table public.workspaces enable row level security;

create trigger workspaces_set_updated_at
before update on public.workspaces
for each row execute function public.update_updated_at_column();

create table public.workspace_members (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  user_id       uuid not null,
  role          public.workspace_role not null default 'member',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  unique (workspace_id, user_id)
);

create index idx_workspace_members_user on public.workspace_members(user_id);
create index idx_workspace_members_ws   on public.workspace_members(workspace_id);

alter table public.workspace_members enable row level security;

create trigger workspace_members_set_updated_at
before update on public.workspace_members
for each row execute function public.update_updated_at_column();

-- SECURITY DEFINER: any membership / per-workspace-role check goes through these.
create or replace function public.is_workspace_member(_workspace_id uuid, _user_id uuid)
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
      and deleted_at is null
  );
$$;

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

-- -------------------------------------------------------------------------
-- 5. WORKSPACE INVITATIONS
-- -------------------------------------------------------------------------

create table public.workspace_invitations (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  email         text not null,
  role          public.workspace_role not null default 'member',
  token         text not null unique default encode(gen_random_bytes(24), 'hex'),
  status        public.invitation_status not null default 'pending',
  invited_by    uuid not null,
  expires_at    timestamptz not null default (now() + interval '7 days'),
  accepted_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_invitations_workspace on public.workspace_invitations(workspace_id);
create index idx_invitations_email     on public.workspace_invitations(email);

alter table public.workspace_invitations enable row level security;

create trigger workspace_invitations_set_updated_at
before update on public.workspace_invitations
for each row execute function public.update_updated_at_column();

-- -------------------------------------------------------------------------
-- 6. SUBSCRIPTIONS (provider-agnostic)
-- -------------------------------------------------------------------------
-- Works with Stripe, LemonSqueezy, manual, or any future provider.
-- No provider-specific columns leak into other tables.

create table public.subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  workspace_id             uuid not null unique references public.workspaces(id) on delete cascade,
  provider                 text not null default 'manual', -- 'stripe' | 'lemonsqueezy' | 'manual' | ...
  provider_customer_id     text,
  provider_subscription_id text,
  tier                     public.subscription_tier not null default 'solo',
  status                   public.subscription_status not null default 'trialing',
  current_period_end       timestamptz,
  trial_ends_at            timestamptz not null default (now() + interval '14 days'),
  cancel_at_period_end     boolean not null default false,
  metadata                 jsonb not null default '{}'::jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index idx_subscriptions_workspace on public.subscriptions(workspace_id);

alter table public.subscriptions enable row level security;

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.update_updated_at_column();

-- -------------------------------------------------------------------------
-- 7. FEATURE FLAGS + has_feature()
-- -------------------------------------------------------------------------

create table public.feature_flags (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  flag          text not null,
  enabled       boolean not null default false,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (workspace_id, flag)
);

create index idx_feature_flags_workspace on public.feature_flags(workspace_id);

alter table public.feature_flags enable row level security;

create trigger feature_flags_set_updated_at
before update on public.feature_flags
for each row execute function public.update_updated_at_column();

create or replace function public.has_feature(_workspace_id uuid, _flag text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select enabled from public.feature_flags
     where workspace_id = _workspace_id and flag = _flag),
    false
  );
$$;

-- -------------------------------------------------------------------------
-- 8. AUDIT LOGS
-- -------------------------------------------------------------------------
-- NOTE: audit_logs support traceability and security best-practice.
-- They are NOT, by themselves, a guarantee of HIPAA/LGPD compliance.
-- Full compliance requires BAA, at-rest encryption, training, breach
-- procedures, etc. — addressed in later weeks of the roadmap.

create table public.audit_logs (
  id            uuid primary key default gen_random_uuid(),
  actor_id      uuid,                    -- nullable: system actions
  workspace_id  uuid references public.workspaces(id) on delete set null,
  action        text not null,           -- e.g. 'profile.updated', 'invite.sent'
  resource_type text,                    -- e.g. 'profile', 'workspace'
  resource_id   text,
  metadata      jsonb not null default '{}'::jsonb,
  ip            inet,
  user_agent    text,
  created_at    timestamptz not null default now()
);

create index idx_audit_logs_workspace on public.audit_logs(workspace_id);
create index idx_audit_logs_actor     on public.audit_logs(actor_id);
create index idx_audit_logs_created   on public.audit_logs(created_at desc);

alter table public.audit_logs enable row level security;

-- Hard rule: client roles MUST NOT insert audit logs directly.
-- Only SECURITY DEFINER functions or service_role may write.
revoke insert on public.audit_logs from anon, authenticated;

-- -------------------------------------------------------------------------
-- 9. RLS POLICIES
-- -------------------------------------------------------------------------

-- ----- profiles -----
create policy "profiles: self read"
on public.profiles for select to authenticated
using (id = auth.uid());

create policy "profiles: self insert"
on public.profiles for insert to authenticated
with check (id = auth.uid());

create policy "profiles: self update"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "profiles: admin read all"
on public.profiles for select to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- ----- user_roles -----
create policy "user_roles: self read"
on public.user_roles for select to authenticated
using (user_id = auth.uid());

create policy "user_roles: admin read all"
on public.user_roles for select to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "user_roles: admin manage"
on public.user_roles for all to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- ----- workspaces -----
create policy "workspaces: members read"
on public.workspaces for select to authenticated
using (public.is_workspace_member(id, auth.uid()));

create policy "workspaces: owner update"
on public.workspaces for update to authenticated
using (public.has_workspace_role(id, auth.uid(), 'owner'))
with check (public.has_workspace_role(id, auth.uid(), 'owner'));

-- INSERT happens via handle_new_user() trigger (SECURITY DEFINER).
-- No client-facing INSERT policy on workspaces in Week 1.

-- ----- workspace_members -----
create policy "workspace_members: self read"
on public.workspace_members for select to authenticated
using (user_id = auth.uid());

create policy "workspace_members: same-workspace read"
on public.workspace_members for select to authenticated
using (public.is_workspace_member(workspace_id, auth.uid()));

create policy "workspace_members: owner manage"
on public.workspace_members for all to authenticated
using (public.has_workspace_role(workspace_id, auth.uid(), 'owner'))
with check (public.has_workspace_role(workspace_id, auth.uid(), 'owner'));

-- ----- workspace_invitations -----
create policy "invitations: workspace members read"
on public.workspace_invitations for select to authenticated
using (public.is_workspace_member(workspace_id, auth.uid()));

create policy "invitations: owner manage"
on public.workspace_invitations for all to authenticated
using (public.has_workspace_role(workspace_id, auth.uid(), 'owner'))
with check (public.has_workspace_role(workspace_id, auth.uid(), 'owner'));

-- ----- subscriptions -----
create policy "subscriptions: members read"
on public.subscriptions for select to authenticated
using (public.is_workspace_member(workspace_id, auth.uid()));

create policy "subscriptions: owner update"
on public.subscriptions for update to authenticated
using (public.has_workspace_role(workspace_id, auth.uid(), 'owner'))
with check (public.has_workspace_role(workspace_id, auth.uid(), 'owner'));

-- INSERT/DELETE via service_role only (webhooks from payment provider).

-- ----- feature_flags -----
create policy "feature_flags: members read"
on public.feature_flags for select to authenticated
using (public.is_workspace_member(workspace_id, auth.uid()));

create policy "feature_flags: owner manage"
on public.feature_flags for all to authenticated
using (public.has_workspace_role(workspace_id, auth.uid(), 'owner'))
with check (public.has_workspace_role(workspace_id, auth.uid(), 'owner'));

-- ----- audit_logs -----
-- READ: workspace owners + global admins.
create policy "audit_logs: workspace owner read"
on public.audit_logs for select to authenticated
using (
  workspace_id is not null
  and public.has_workspace_role(workspace_id, auth.uid(), 'owner')
);

create policy "audit_logs: admin read all"
on public.audit_logs for select to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- No INSERT/UPDATE/DELETE policies. Writes only via SECURITY DEFINER
-- helpers or service_role. INSERT was already revoked above.

-- -------------------------------------------------------------------------
-- 10. ATOMIC SIGNUP TRIGGER
-- -------------------------------------------------------------------------
-- One transaction creates: profile + therapist role + personal workspace +
-- owner membership + 14-day trial subscription record.
-- Idempotent via ON CONFLICT guards.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_full_name    text;
  v_slug         text;
begin
  v_full_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    split_part(new.email, '@', 1)
  );

  -- 1. Profile
  insert into public.profiles (id, full_name)
  values (new.id, v_full_name)
  on conflict (id) do nothing;

  -- 2. Default global role: therapist
  insert into public.user_roles (user_id, role)
  values (new.id, 'therapist')
  on conflict (user_id, role) do nothing;

  -- 3. Personal workspace (slug derived from user id to avoid collisions)
  v_slug := 'ws-' || replace(new.id::text, '-', '');
  insert into public.workspaces (name, slug)
  values (v_full_name || '''s Workspace', v_slug)
  returning id into v_workspace_id;

  -- 4. Owner membership
  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, new.id, 'owner');

  -- 5. Trialing subscription (provider = manual until checkout happens)
  insert into public.subscriptions (workspace_id, provider, tier, status)
  values (v_workspace_id, 'manual', 'solo', 'trialing');

  return new;
end;
$$;

-- Bind to auth.users insertion (only place we touch the auth schema).
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
