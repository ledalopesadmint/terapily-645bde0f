-- =============================================================
-- 1. Enum
-- =============================================================
CREATE TYPE public.ephemeral_activity_status AS ENUM (
  'pending', 'opened', 'completed', 'expired', 'revoked', 'purged'
);

-- =============================================================
-- 2. Table: ephemeral_activities
-- =============================================================
CREATE TABLE public.ephemeral_activities (
  id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id    uuid        NOT NULL,
  patient_id      uuid        NOT NULL,
  activity_id     uuid        NOT NULL,
  assigned_by     uuid        NOT NULL,
  delivery_mode   delivery_mode NOT NULL DEFAULT 'shared_link',

  token_hash      text        NOT NULL,
  token_expires_at timestamptz NOT NULL,
  token_first_opened_at timestamptz,
  token_open_count int        NOT NULL DEFAULT 0,

  status          ephemeral_activity_status NOT NULL DEFAULT 'pending',
  used_at         timestamptz,
  completed_at    timestamptz,

  therapist_consent_at        timestamptz NOT NULL,
  therapist_consent_text_hash text        NOT NULL,

  purge_after     timestamptz,

  pdf_downloaded_at   timestamptz,
  pdf_download_count  int NOT NULL DEFAULT 0,

  revocation_reason text,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_ephemeral_activities_token_hash ON public.ephemeral_activities (token_hash);
CREATE INDEX idx_ephemeral_activities_purge ON public.ephemeral_activities (purge_after) WHERE purge_after IS NOT NULL AND status = 'completed';
CREATE INDEX idx_ephemeral_activities_patient ON public.ephemeral_activities (patient_id, workspace_id);

CREATE TRIGGER update_ephemeral_activities_updated_at
  BEFORE UPDATE ON public.ephemeral_activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.ephemeral_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ephemeral_activities: workspace read"
  ON public.ephemeral_activities FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      is_workspace_member(workspace_id, auth.uid())
      AND (
        has_workspace_role(workspace_id, auth.uid(), 'owner'::workspace_role)
        OR assigned_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM patients p
          WHERE p.id = ephemeral_activities.patient_id
            AND p.workspace_id = ephemeral_activities.workspace_id
            AND p.assigned_therapist_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "ephemeral_activities: workspace insert"
  ON public.ephemeral_activities FOR INSERT TO authenticated
  WITH CHECK (
    is_workspace_member(workspace_id, auth.uid())
    AND assigned_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = ephemeral_activities.patient_id
        AND p.workspace_id = ephemeral_activities.workspace_id
        AND p.deleted_at IS NULL
        AND (
          p.assigned_therapist_id = auth.uid()
          OR has_workspace_role(p.workspace_id, auth.uid(), 'owner'::workspace_role)
        )
    )
  );

CREATE POLICY "ephemeral_activities: workspace update"
  ON public.ephemeral_activities FOR UPDATE TO authenticated
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

-- =============================================================
-- 3. Table: ephemeral_responses
-- =============================================================
CREATE TABLE public.ephemeral_responses (
  id                       uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ephemeral_activity_id    uuid        NOT NULL REFERENCES public.ephemeral_activities(id),
  workspace_id             uuid        NOT NULL,
  patient_id               uuid        NOT NULL,
  activity_id              uuid        NOT NULL,

  response_data_encrypted  text,

  submitted_at             timestamptz NOT NULL DEFAULT now(),
  submitted_via            delivery_mode NOT NULL,
  submitted_ip             inet,
  submitted_user_agent     text,

  purged_at                timestamptz,

  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ephemeral_responses_activity ON public.ephemeral_responses (ephemeral_activity_id);
CREATE INDEX idx_ephemeral_responses_patient ON public.ephemeral_responses (patient_id, workspace_id);

CREATE TRIGGER update_ephemeral_responses_updated_at
  BEFORE UPDATE ON public.ephemeral_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.ephemeral_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ephemeral_responses: workspace read"
  ON public.ephemeral_responses FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      is_workspace_member(workspace_id, auth.uid())
      AND (
        has_workspace_role(workspace_id, auth.uid(), 'owner'::workspace_role)
        OR EXISTS (
          SELECT 1 FROM patients p
          WHERE p.id = ephemeral_responses.patient_id
            AND p.workspace_id = ephemeral_responses.workspace_id
            AND p.assigned_therapist_id = auth.uid()
        )
      )
    )
  );

-- =============================================================
-- 4. Audit trigger: ephemeral_activities
-- =============================================================
CREATE OR REPLACE FUNCTION public.audit_ephemeral_activity_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF (tg_op = 'INSERT') THEN
    INSERT INTO public.audit_logs (
      actor_id, workspace_id, action, resource_type, resource_id, metadata
    ) VALUES (
      auth.uid(), new.workspace_id, 'ephemeral.assigned', 'ephemeral_activity', new.id::text,
      jsonb_build_object(
        'patient_id', new.patient_id,
        'activity_id', new.activity_id,
        'delivery_mode', new.delivery_mode,
        'expires_at', new.token_expires_at
      )
    );
    INSERT INTO public.audit_logs (
      actor_id, workspace_id, action, resource_type, resource_id, metadata
    ) VALUES (
      auth.uid(), new.workspace_id, 'ephemeral.consent_acknowledged', 'ephemeral_activity', new.id::text,
      jsonb_build_object(
        'consent_at', new.therapist_consent_at,
        'consent_text_hash', new.therapist_consent_text_hash
      )
    );
    RETURN new;
  END IF;

  IF (tg_op = 'UPDATE') THEN
    IF (new.status IS DISTINCT FROM old.status) THEN
      INSERT INTO public.audit_logs (
        actor_id, workspace_id, action, resource_type, resource_id, metadata
      ) VALUES (
        auth.uid(), new.workspace_id, 'ephemeral.status_changed', 'ephemeral_activity', new.id::text,
        jsonb_build_object('from', old.status, 'to', new.status, 'patient_id', new.patient_id)
      );
    END IF;

    IF (new.used_at IS NOT NULL AND old.used_at IS NULL) THEN
      INSERT INTO public.audit_logs (
        actor_id, workspace_id, action, resource_type, resource_id, metadata
      ) VALUES (
        NULL, new.workspace_id, 'ephemeral.submitted', 'ephemeral_activity', new.id::text,
        jsonb_build_object(
          'patient_id', new.patient_id,
          'activity_id', new.activity_id,
          'purge_after', new.purge_after
        )
      );
    END IF;

    IF (new.pdf_download_count > old.pdf_download_count) THEN
      INSERT INTO public.audit_logs (
        actor_id, workspace_id, action, resource_type, resource_id, metadata
      ) VALUES (
        auth.uid(), new.workspace_id, 'ephemeral.pdf_downloaded', 'ephemeral_activity', new.id::text,
        jsonb_build_object(
          'download_count', new.pdf_download_count,
          'patient_id', new.patient_id
        )
      );
    END IF;

    RETURN new;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER audit_ephemeral_activity_change
  AFTER INSERT OR UPDATE ON public.ephemeral_activities
  FOR EACH ROW EXECUTE FUNCTION public.audit_ephemeral_activity_change();

-- =============================================================
-- 5. Audit trigger: ephemeral_responses
-- =============================================================
CREATE OR REPLACE FUNCTION public.audit_ephemeral_response_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    actor_id, workspace_id, action, resource_type, resource_id, metadata
  ) VALUES (
    NULL, new.workspace_id, 'ephemeral.response_recorded', 'ephemeral_response', new.id::text,
    jsonb_build_object(
      'patient_id', new.patient_id,
      'ephemeral_activity_id', new.ephemeral_activity_id,
      'activity_id', new.activity_id,
      'submitted_via', new.submitted_via
    )
  );
  RETURN new;
END;
$$;

CREATE TRIGGER audit_ephemeral_response_insert
  AFTER INSERT ON public.ephemeral_responses
  FOR EACH ROW EXECUTE FUNCTION public.audit_ephemeral_response_insert();

-- =============================================================
-- 6. Purge function
-- =============================================================
CREATE OR REPLACE FUNCTION public.purge_expired_ephemeral_data()
RETURNS TABLE(purged_count integer, run_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer := 0;
  v_now   timestamptz := now();
  v_ids   uuid[];
BEGIN
  SELECT array_agg(er.id), count(*)
    INTO v_ids, v_count
  FROM public.ephemeral_responses er
  JOIN public.ephemeral_activities ea ON ea.id = er.ephemeral_activity_id
  WHERE ea.purge_after IS NOT NULL
    AND ea.purge_after < v_now
    AND er.purged_at IS NULL
    AND er.response_data_encrypted IS NOT NULL;

  IF v_count = 0 OR v_ids IS NULL THEN
    RETURN QUERY SELECT 0, v_now;
    RETURN;
  END IF;

  UPDATE public.ephemeral_responses
  SET response_data_encrypted = NULL,
      purged_at = v_now,
      updated_at = v_now
  WHERE id = ANY(v_ids);

  UPDATE public.ephemeral_activities
  SET status = 'purged',
      updated_at = v_now
  WHERE id IN (
    SELECT DISTINCT ephemeral_activity_id
    FROM public.ephemeral_responses
    WHERE id = ANY(v_ids)
  )
  AND status = 'completed';

  INSERT INTO public.audit_logs (
    actor_id, workspace_id, action, resource_type, resource_id, metadata
  )
  SELECT
    NULL, er.workspace_id, 'ephemeral.purged', 'ephemeral_response', er.id::text,
    jsonb_build_object(
      'ephemeral_activity_id', er.ephemeral_activity_id,
      'patient_id', er.patient_id,
      'purged_at', v_now
    )
  FROM public.ephemeral_responses er
  WHERE er.id = ANY(v_ids);

  INSERT INTO public.audit_logs (
    actor_id, workspace_id, action, resource_type, metadata
  ) VALUES (
    NULL, NULL, 'system.ephemeral_purge_batch', 'ephemeral_response',
    jsonb_build_object('count', v_count, 'run_at', v_now)
  );

  RETURN QUERY SELECT v_count, v_now;
END;
$$;

-- =============================================================
-- 7. pg_cron
-- =============================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'purge-expired-ephemeral-data',
  '*/15 * * * *',
  $$SELECT * FROM public.purge_expired_ephemeral_data();$$
);