-- =============================================
-- 1. activity_theme enum (6 temas brand-coerentes)
-- =============================================
create type public.activity_theme as enum (
  'sage',       -- calmo, respiração, mindfulness
  'mauve',      -- autocompaixão, vínculo
  'navy',       -- avaliações clínicas, escalas
  'cream',      -- psicoeducação, leitura
  'terracotta', -- somático, corpo
  'sage_dark'   -- sono, noite, regulação
);

-- =============================================
-- 2. activity_status enum
-- =============================================
create type public.activity_status as enum ('draft', 'published', 'archived');

-- =============================================
-- 3. activity_archetype enum (5 arquétipos do Player)
-- =============================================
create type public.activity_archetype as enum (
  'quiz_scale',
  'drag_drop',
  'structured_form',
  'guided_timer',
  'guided_script'
);

-- =============================================
-- 4. activity_catalog (catálogo global, não pertence a workspace)
-- =============================================
create table public.activity_catalog (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  short_description text not null,
  archetype public.activity_archetype not null,
  theme public.activity_theme not null default 'sage',
  category text not null,
  config jsonb not null default '{}'::jsonb,
  status public.activity_status not null default 'draft',
  is_featured boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_activity_catalog_status on public.activity_catalog(status);
create index idx_activity_catalog_archetype on public.activity_catalog(archetype);
create index idx_activity_catalog_category on public.activity_catalog(category);

alter table public.activity_catalog enable row level security;

-- RLS: qualquer autenticado lê published; admin lê tudo
create policy "activity_catalog: authenticated read published"
  on public.activity_catalog
  for select
  to authenticated
  using (status = 'published');

create policy "activity_catalog: admin read all"
  on public.activity_catalog
  for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- RLS: só admin escreve
create policy "activity_catalog: admin manage"
  on public.activity_catalog
  for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Trigger updated_at
create trigger update_activity_catalog_updated_at
  before update on public.activity_catalog
  for each row execute function public.update_updated_at_column();

-- =============================================
-- 5. Atualiza handle_new_user: admin não recebe workspace
-- =============================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_workspace_id uuid;
  v_full_name    text;
  v_slug         text;
  v_is_admin     boolean;
begin
  v_full_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    split_part(new.email, '@', 1)
  );

  v_is_admin := (new.email = 'admin@terapily.com');

  -- 1. Profile (todos têm)
  insert into public.profiles (id, full_name)
  values (new.id, v_full_name)
  on conflict (id) do nothing;

  -- 2. Role
  if v_is_admin then
    insert into public.user_roles (user_id, role)
    values (new.id, 'admin')
    on conflict (user_id, role) do nothing;
    -- admin NÃO recebe workspace pessoal nem subscription
    return new;
  end if;

  -- Terapeuta padrão
  insert into public.user_roles (user_id, role)
  values (new.id, 'therapist')
  on conflict (user_id, role) do nothing;

  -- 3. Workspace pessoal
  v_slug := 'ws-' || replace(new.id::text, '-', '');
  insert into public.workspaces (name, slug)
  values (v_full_name || '''s Workspace', v_slug)
  returning id into v_workspace_id;

  -- 4. Owner membership
  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, new.id, 'owner');

  -- 5. Trialing subscription
  insert into public.subscriptions (workspace_id, provider, tier, status)
  values (v_workspace_id, 'manual', 'solo', 'trialing');

  return new;
end;
$function$;