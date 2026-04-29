-- =========================================================================
-- patients — S2 / Terça
-- =========================================================================
-- PHI fica APENAS em colunas com sufixo `_encrypted` (text).
-- Server functions cifram com AES-GCM-256 antes do INSERT/UPDATE.
-- Banco trata esses campos como opacos — nunca usar em ILIKE/ORDER.
--
-- Campos NÃO-PHI safe pra busca/listagem:
--   display_name, initials, status, assigned_therapist_id, tags
--
-- Multi-tenant: workspace_id + RLS via is_workspace_member +
-- has_workspace_role('owner') pra visão ampliada.

create type public.patient_status as enum ('active', 'archived');

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  assigned_therapist_id uuid not null references auth.users(id) on delete restrict,

  -- Identificação não-PHI (UI, busca, listagem)
  display_name text not null,
  initials text not null,
  tags text[] not null default '{}',

  -- PHI cifrado (AES-GCM-256, formato v1:iv:ct)
  full_name_encrypted text,
  email_encrypted text,
  phone_encrypted text,
  date_of_birth_encrypted text,
  intake_notes_encrypted text,

  status public.patient_status not null default 'active',
  archived_at timestamptz,
  deleted_at timestamptz,

  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint patients_display_name_len check (char_length(display_name) between 1 and 80),
  constraint patients_initials_len check (char_length(initials) between 1 and 6)
);

-- Índices úteis pra listagem e gating de limites
create index patients_workspace_active_idx
  on public.patients (workspace_id, status)
  where deleted_at is null;

create index patients_therapist_idx
  on public.patients (assigned_therapist_id)
  where deleted_at is null;

create index patients_workspace_created_idx
  on public.patients (workspace_id, created_at desc)
  where deleted_at is null;

-- updated_at automático
create trigger patients_set_updated_at
  before update on public.patients
  for each row execute function public.update_updated_at_column();

-- =========================================================================
-- RLS
-- =========================================================================
alter table public.patients enable row level security;

-- SELECT: membros do workspace; owner vê tudo, terapeuta vê só os seus.
create policy "patients: workspace read"
  on public.patients for select
  to authenticated
  using (
    deleted_at is null
    and is_workspace_member(workspace_id, auth.uid())
    and (
      has_workspace_role(workspace_id, auth.uid(), 'owner')
      or assigned_therapist_id = auth.uid()
    )
  );

-- INSERT: precisa ser membro, e quem cria precisa ser o assigned_therapist
-- OU o owner do workspace (que pode atribuir pra outro terapeuta).
create policy "patients: workspace insert"
  on public.patients for insert
  to authenticated
  with check (
    is_workspace_member(workspace_id, auth.uid())
    and created_by = auth.uid()
    and (
      assigned_therapist_id = auth.uid()
      or has_workspace_role(workspace_id, auth.uid(), 'owner')
    )
    -- terapeuta atribuído precisa ser membro do workspace
    and is_workspace_member(workspace_id, assigned_therapist_id)
  );

-- UPDATE: terapeuta responsável OU owner. Bloqueia mover pra outro workspace.
create policy "patients: assigned or owner update"
  on public.patients for update
  to authenticated
  using (
    is_workspace_member(workspace_id, auth.uid())
    and (
      assigned_therapist_id = auth.uid()
      or has_workspace_role(workspace_id, auth.uid(), 'owner')
    )
  )
  with check (
    is_workspace_member(workspace_id, auth.uid())
    and (
      assigned_therapist_id = auth.uid()
      or has_workspace_role(workspace_id, auth.uid(), 'owner')
    )
    and is_workspace_member(workspace_id, assigned_therapist_id)
  );

-- DELETE: NÃO permitido pelo client. Soft delete via UPDATE deleted_at.
-- (sem policy DELETE = bloqueado)

-- =========================================================================
-- Audit trigger — sem PHI no metadata
-- =========================================================================
create or replace function public.audit_patient_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.audit_logs (actor_id, workspace_id, action, resource_type, resource_id, metadata)
    values (
      auth.uid(), new.workspace_id, 'patient.created', 'patient', new.id::text,
      jsonb_build_object(
        'assigned_therapist_id', new.assigned_therapist_id,
        'status', new.status
      )
    );
    return new;
  end if;

  if (tg_op = 'UPDATE') then
    -- soft delete
    if (new.deleted_at is not null and old.deleted_at is null) then
      insert into public.audit_logs (actor_id, workspace_id, action, resource_type, resource_id, metadata)
      values (auth.uid(), new.workspace_id, 'patient.soft_deleted', 'patient', new.id::text, '{}'::jsonb);
    end if;

    -- restore
    if (new.deleted_at is null and old.deleted_at is not null) then
      insert into public.audit_logs (actor_id, workspace_id, action, resource_type, resource_id, metadata)
      values (auth.uid(), new.workspace_id, 'patient.restored', 'patient', new.id::text, '{}'::jsonb);
    end if;

    -- archive / unarchive
    if (new.status is distinct from old.status) then
      insert into public.audit_logs (actor_id, workspace_id, action, resource_type, resource_id, metadata)
      values (
        auth.uid(), new.workspace_id, 'patient.status_changed', 'patient', new.id::text,
        jsonb_build_object('from', old.status, 'to', new.status)
      );
    end if;

    -- reassign
    if (new.assigned_therapist_id is distinct from old.assigned_therapist_id) then
      insert into public.audit_logs (actor_id, workspace_id, action, resource_type, resource_id, metadata)
      values (
        auth.uid(), new.workspace_id, 'patient.reassigned', 'patient', new.id::text,
        jsonb_build_object(
          'from_therapist', old.assigned_therapist_id,
          'to_therapist', new.assigned_therapist_id
        )
      );
    end if;

    -- Outras edições: registra só a lista de campos alterados (sem valores).
    -- Nunca colocar valores de campos *_encrypted no metadata.
    return new;
  end if;

  return new;
end;
$$;

create trigger patients_audit
  after insert or update on public.patients
  for each row execute function public.audit_patient_change();

-- =========================================================================
-- Helper: contagem de pacientes ativos no workspace (gating de plano)
-- =========================================================================
create or replace function public.workspace_active_patient_count(_workspace_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.patients
  where workspace_id = _workspace_id
    and deleted_at is null
    and status = 'active';
$$;
