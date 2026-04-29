-- =========================================
-- S3: Magic Link + Patient Activities
-- Constraint: magic-link-rules-locked
-- =========================================

-- 1. ENUMS -------------------------------------------------

create type public.delivery_mode as enum (
  'in_session',
  'shared_link',
  'both'
);

create type public.patient_activity_status as enum (
  'pending',
  'in_progress',
  'completed',
  'expired',
  'revoked'
);

create type public.activity_severity as enum (
  'minimal',
  'mild',
  'moderate',
  'moderately_severe',
  'severe',
  'not_applicable'
);

-- 2. patient_activities ------------------------------------

create table public.patient_activities (
  id uuid primary key default gen_random_uuid(),

  workspace_id            uuid not null,
  patient_id              uuid not null,
  assigned_by             uuid not null,
  activity_id             uuid not null references public.activity_catalog(id) on delete restrict,

  delivery_mode           public.delivery_mode not null,
  status                  public.patient_activity_status not null default 'pending',

  token_hash              text,
  token_expires_at        timestamptz,
  token_sent_at           timestamptz,
  token_first_opened_at   timestamptz,
  token_open_count        integer not null default 0,
  used_at                 timestamptz,

  applied_at              timestamptz,
  response_id             uuid,

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint patient_activities_link_requires_hash check (
    (delivery_mode = 'in_session' and token_hash is null and token_expires_at is null)
    or
    (delivery_mode in ('shared_link', 'both') and token_hash is not null and token_expires_at is not null)
  ),

  constraint patient_activities_hash_format check (
    token_hash is null or (length(token_hash) = 64 and token_hash ~ '^[a-f0-9]{64}$')
  )
);

create unique index patient_activities_token_hash_uidx
  on public.patient_activities (token_hash)
  where token_hash is not null;

create index patient_activities_patient_idx
  on public.patient_activities (patient_id, created_at desc);

create index patient_activities_workspace_idx
  on public.patient_activities (workspace_id, created_at desc);

create index patient_activities_assigned_by_idx
  on public.patient_activities (assigned_by, created_at desc);

create index patient_activities_status_idx
  on public.patient_activities (workspace_id, status);

create trigger patient_activities_set_updated_at
  before update on public.patient_activities
  for each row execute function public.update_updated_at_column();

alter table public.patient_activities enable row level security;

create policy "patient_activities: workspace read"
  on public.patient_activities
  for select
  to authenticated
  using (
    has_role(auth.uid(), 'admin'::app_role)
    or (
      is_workspace_member(workspace_id, auth.uid())
      and (
        has_workspace_role(workspace_id, auth.uid(), 'owner'::workspace_role)
        or assigned_by = auth.uid()
        or exists (
          select 1 from public.patients p
          where p.id = patient_id
            and p.workspace_id = patient_activities.workspace_id
            and p.assigned_therapist_id = auth.uid()
        )
      )
    )
  );

create policy "patient_activities: workspace insert"
  on public.patient_activities
  for insert
  to authenticated
  with check (
    is_workspace_member(workspace_id, auth.uid())
    and assigned_by = auth.uid()
    and exists (
      select 1 from public.patients p
      where p.id = patient_id
        and p.workspace_id = patient_activities.workspace_id
        and p.deleted_at is null
        and (
          p.assigned_therapist_id = auth.uid()
          or has_workspace_role(p.workspace_id, auth.uid(), 'owner'::workspace_role)
        )
    )
  );

create policy "patient_activities: workspace update"
  on public.patient_activities
  for update
  to authenticated
  using (
    is_workspace_member(workspace_id, auth.uid())
    and (
      assigned_by = auth.uid()
      or has_workspace_role(workspace_id, auth.uid(), 'owner'::workspace_role)
    )
  )
  with check (
    is_workspace_member(workspace_id, auth.uid())
    and (
      assigned_by = auth.uid()
      or has_workspace_role(workspace_id, auth.uid(), 'owner'::workspace_role)
    )
  );

-- DELETE bloqueado (sem policy)

-- 3. activity_responses -----------------------------------

create table public.activity_responses (
  id uuid primary key default gen_random_uuid(),

  patient_activity_id uuid not null references public.patient_activities(id) on delete restrict,

  workspace_id uuid not null,
  patient_id   uuid not null,
  activity_id  uuid not null references public.activity_catalog(id) on delete restrict,

  raw_responses_encrypted text,
  score                   numeric,
  severity                public.activity_severity,
  scoring_metadata        jsonb not null default '{}'::jsonb,

  submitted_via           public.delivery_mode not null,
  submitted_ip            inet,
  submitted_user_agent    text,

  submitted_at            timestamptz not null default now(),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create unique index activity_responses_patient_activity_uidx
  on public.activity_responses (patient_activity_id);

create index activity_responses_patient_idx
  on public.activity_responses (patient_id, submitted_at desc);

create index activity_responses_workspace_idx
  on public.activity_responses (workspace_id, submitted_at desc);

create trigger activity_responses_set_updated_at
  before update on public.activity_responses
  for each row execute function public.update_updated_at_column();

alter table public.patient_activities
  add constraint patient_activities_response_fk
  foreign key (response_id) references public.activity_responses(id)
  on delete set null
  deferrable initially deferred;

alter table public.activity_responses enable row level security;

create policy "activity_responses: workspace read"
  on public.activity_responses
  for select
  to authenticated
  using (
    has_role(auth.uid(), 'admin'::app_role)
    or (
      is_workspace_member(workspace_id, auth.uid())
      and (
        has_workspace_role(workspace_id, auth.uid(), 'owner'::workspace_role)
        or exists (
          select 1 from public.patients p
          where p.id = patient_id
            and p.workspace_id = activity_responses.workspace_id
            and p.assigned_therapist_id = auth.uid()
        )
      )
    )
  );

-- INSERT/UPDATE/DELETE bloqueados pro client (server function service_role)

-- 4. AUDIT TRIGGERS ---------------------------------------

create or replace function public.audit_patient_activity_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.audit_logs (
      actor_id, workspace_id, action, resource_type, resource_id, metadata
    ) values (
      auth.uid(),
      new.workspace_id,
      'activity.assigned',
      'patient_activity',
      new.id::text,
      jsonb_build_object(
        'patient_id', new.patient_id,
        'activity_id', new.activity_id,
        'delivery_mode', new.delivery_mode,
        'has_link', (new.token_hash is not null),
        'expires_at', new.token_expires_at
      )
    );
    return new;
  end if;

  if (tg_op = 'UPDATE') then
    if (new.status is distinct from old.status) then
      insert into public.audit_logs (
        actor_id, workspace_id, action, resource_type, resource_id, metadata
      ) values (
        auth.uid(),
        new.workspace_id,
        'activity.status_changed',
        'patient_activity',
        new.id::text,
        jsonb_build_object(
          'from', old.status,
          'to', new.status,
          'patient_id', new.patient_id
        )
      );
    end if;

    if (new.token_first_opened_at is not null and old.token_first_opened_at is null) then
      insert into public.audit_logs (
        actor_id, workspace_id, action, resource_type, resource_id, metadata
      ) values (
        null,
        new.workspace_id,
        'activity.link_opened',
        'patient_activity',
        new.id::text,
        jsonb_build_object('patient_id', new.patient_id)
      );
    end if;

    if (new.used_at is not null and old.used_at is null) then
      insert into public.audit_logs (
        actor_id, workspace_id, action, resource_type, resource_id, metadata
      ) values (
        null,
        new.workspace_id,
        'activity.submitted',
        'patient_activity',
        new.id::text,
        jsonb_build_object(
          'patient_id', new.patient_id,
          'activity_id', new.activity_id,
          'delivery_mode', new.delivery_mode
        )
      );
    end if;

    return new;
  end if;

  return new;
end;
$$;

create trigger audit_patient_activity_change_trg
  after insert or update on public.patient_activities
  for each row execute function public.audit_patient_activity_change();

create or replace function public.audit_activity_response_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (
    actor_id, workspace_id, action, resource_type, resource_id, metadata
  ) values (
    auth.uid(),
    new.workspace_id,
    'activity.response_recorded',
    'activity_response',
    new.id::text,
    jsonb_build_object(
      'patient_id', new.patient_id,
      'patient_activity_id', new.patient_activity_id,
      'activity_id', new.activity_id,
      'submitted_via', new.submitted_via,
      'severity', new.severity
    )
  );
  return new;
end;
$$;

create trigger audit_activity_response_insert_trg
  after insert on public.activity_responses
  for each row execute function public.audit_activity_response_insert();
