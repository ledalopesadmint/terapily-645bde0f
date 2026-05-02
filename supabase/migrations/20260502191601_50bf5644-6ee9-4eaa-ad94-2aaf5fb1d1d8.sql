
-- ============================================================
-- Habit Tracker: reusable links + execution history
-- ============================================================

-- 1. habit_links — reusable tokens for mindfulness/habit activities
CREATE TABLE public.habit_links (
  id            uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id  uuid        NOT NULL,
  patient_id    uuid        NOT NULL,
  activity_id   uuid        NOT NULL,
  assigned_by   uuid        NOT NULL,
  token_hash    text        NOT NULL,
  status        text        NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'expired', 'revoked')),
  expires_at    timestamptz NOT NULL,
  revocation_reason text,
  total_entries integer     NOT NULL DEFAULT 0,
  last_entry_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  -- One active link per patient+activity+workspace
  CONSTRAINT uq_habit_link_active UNIQUE NULLS NOT DISTINCT (workspace_id, patient_id, activity_id)
    DEFERRABLE INITIALLY DEFERRED
);

-- Index for token lookup (public route)
CREATE UNIQUE INDEX idx_habit_links_token_hash ON public.habit_links (token_hash);
CREATE INDEX idx_habit_links_patient ON public.habit_links (patient_id, workspace_id);
CREATE INDEX idx_habit_links_status ON public.habit_links (status) WHERE status = 'active';

-- Timestamp trigger
CREATE TRIGGER update_habit_links_updated_at
  BEFORE UPDATE ON public.habit_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.habit_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "habit_links: workspace read"
  ON public.habit_links FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      is_workspace_member(workspace_id, auth.uid())
      AND (
        has_workspace_role(workspace_id, auth.uid(), 'owner'::workspace_role)
        OR assigned_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM patients p
          WHERE p.id = habit_links.patient_id
            AND p.workspace_id = habit_links.workspace_id
            AND p.assigned_therapist_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "habit_links: workspace insert"
  ON public.habit_links FOR INSERT TO authenticated
  WITH CHECK (
    is_workspace_member(workspace_id, auth.uid())
    AND assigned_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = habit_links.patient_id
        AND p.workspace_id = habit_links.workspace_id
        AND p.deleted_at IS NULL
        AND (
          p.assigned_therapist_id = auth.uid()
          OR has_workspace_role(p.workspace_id, auth.uid(), 'owner'::workspace_role)
        )
    )
  );

CREATE POLICY "habit_links: workspace update"
  ON public.habit_links FOR UPDATE TO authenticated
  USING (
    is_workspace_member(workspace_id, auth.uid())
    AND (
      assigned_by = auth.uid()
      OR has_workspace_role(workspace_id, auth.uid(), 'owner'::workspace_role)
    )
  )
  WITH CHECK (
    is_workspace_member(workspace_id, auth.uid())
    AND (
      assigned_by = auth.uid()
      OR has_workspace_role(workspace_id, auth.uid(), 'owner'::workspace_role)
    )
  );

-- 2. habit_entries — individual execution records (immutable)
CREATE TABLE public.habit_entries (
  id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_link_id   uuid        NOT NULL,
  workspace_id    uuid        NOT NULL,
  patient_id      uuid        NOT NULL,
  activity_id     uuid        NOT NULL,
  completed_at    timestamptz NOT NULL DEFAULT now(),
  duration_seconds integer,
  cycles_completed integer,
  metadata_encrypted text,
  ip              inet,
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_habit_entries_link ON public.habit_entries (habit_link_id);
CREATE INDEX idx_habit_entries_patient ON public.habit_entries (patient_id, workspace_id);
CREATE INDEX idx_habit_entries_completed ON public.habit_entries (completed_at DESC);

-- RLS
ALTER TABLE public.habit_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "habit_entries: workspace read"
  ON public.habit_entries FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      is_workspace_member(workspace_id, auth.uid())
      AND (
        has_workspace_role(workspace_id, auth.uid(), 'owner'::workspace_role)
        OR EXISTS (
          SELECT 1 FROM patients p
          WHERE p.id = habit_entries.patient_id
            AND p.workspace_id = habit_entries.workspace_id
            AND p.assigned_therapist_id = auth.uid()
        )
      )
    )
  );

-- No INSERT/UPDATE/DELETE from client — entries created via server function only.
-- Same pattern as activity_responses.

-- 3. Audit triggers

CREATE OR REPLACE FUNCTION public.audit_habit_link_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $fn$
BEGIN
  IF (tg_op = 'INSERT') THEN
    INSERT INTO public.audit_logs (actor_id, workspace_id, action, resource_type, resource_id, metadata)
    VALUES (
      auth.uid(), new.workspace_id, 'habit_link.created', 'habit_link', new.id::text,
      jsonb_build_object(
        'patient_id', new.patient_id,
        'activity_id', new.activity_id,
        'expires_at', new.expires_at
      )
    );
    RETURN new;
  END IF;

  IF (tg_op = 'UPDATE') THEN
    IF (new.status IS DISTINCT FROM old.status) THEN
      INSERT INTO public.audit_logs (actor_id, workspace_id, action, resource_type, resource_id, metadata)
      VALUES (
        auth.uid(), new.workspace_id, 'habit_link.status_changed', 'habit_link', new.id::text,
        jsonb_build_object('from', old.status, 'to', new.status, 'patient_id', new.patient_id)
      );
    END IF;
    RETURN new;
  END IF;

  RETURN NULL;
END;
$fn$;

CREATE TRIGGER trg_audit_habit_link
  AFTER INSERT OR UPDATE ON public.habit_links
  FOR EACH ROW EXECUTE FUNCTION public.audit_habit_link_change();

CREATE OR REPLACE FUNCTION public.audit_habit_entry_insert()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $fn$
BEGIN
  INSERT INTO public.audit_logs (actor_id, workspace_id, action, resource_type, resource_id, metadata)
  VALUES (
    NULL, new.workspace_id, 'habit.entry_recorded', 'habit_entry', new.id::text,
    jsonb_build_object(
      'patient_id', new.patient_id,
      'habit_link_id', new.habit_link_id,
      'activity_id', new.activity_id,
      'duration_seconds', new.duration_seconds,
      'cycles_completed', new.cycles_completed
    )
  );

  -- Update counters on parent link
  UPDATE public.habit_links
  SET total_entries = total_entries + 1,
      last_entry_at = new.completed_at
  WHERE id = new.habit_link_id;

  RETURN new;
END;
$fn$;

CREATE TRIGGER trg_audit_habit_entry
  AFTER INSERT ON public.habit_entries
  FOR EACH ROW EXECUTE FUNCTION public.audit_habit_entry_insert();
