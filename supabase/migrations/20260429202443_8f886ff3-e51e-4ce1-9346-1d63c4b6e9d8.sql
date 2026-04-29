-- =========================================================================
-- S3 Etapa 3 — activity_drafts (autosave server-side seguro)
-- =========================================================================
-- Aprovado pela Leda em 2026-04-29 com desvio explícito da decisão original
-- da Etapa 2. Regras travadas em mem://features/activity-drafts-s3.

CREATE TABLE IF NOT EXISTS public.activity_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_activity_id uuid NOT NULL UNIQUE,
  workspace_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  draft_encrypted text NOT NULL,
  completion_percent integer NOT NULL DEFAULT 0
    CHECK (completion_percent BETWEEN 0 AND 100),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_drafts_patient
  ON public.activity_drafts (patient_id, workspace_id);

CREATE INDEX IF NOT EXISTS idx_activity_drafts_expires
  ON public.activity_drafts (expires_at);

-- Timestamp trigger
DROP TRIGGER IF EXISTS trg_activity_drafts_updated_at ON public.activity_drafts;
CREATE TRIGGER trg_activity_drafts_updated_at
  BEFORE UPDATE ON public.activity_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- RLS
-- =========================================================================
ALTER TABLE public.activity_drafts ENABLE ROW LEVEL SECURITY;

-- Leitura: workspace owner / assigned therapist / admin (debug, nada de PHI vaza
-- porque o conteúdo está cifrado com PHI_ENCRYPTION_KEY que não está no client).
CREATE POLICY "activity_drafts: workspace read"
  ON public.activity_drafts
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      is_workspace_member(workspace_id, auth.uid())
      AND (
        has_workspace_role(workspace_id, auth.uid(), 'owner'::workspace_role)
        OR EXISTS (
          SELECT 1 FROM public.patients p
          WHERE p.id = activity_drafts.patient_id
            AND p.workspace_id = activity_drafts.workspace_id
            AND p.assigned_therapist_id = auth.uid()
        )
      )
    )
  );

-- Cliente NÃO pode INSERT, UPDATE, DELETE. Tudo via service role nas server
-- functions públicas (saveActivityDraft, discardActivityDraft, submit).
REVOKE INSERT, UPDATE, DELETE ON public.activity_drafts FROM authenticated, anon;

-- =========================================================================
-- Auditoria — sem PHI
-- =========================================================================
CREATE OR REPLACE FUNCTION public.audit_activity_draft_change()
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
      NULL,
      new.workspace_id,
      'activity.draft_saved',
      'activity_draft',
      new.id::text,
      jsonb_build_object(
        'patient_id', new.patient_id,
        'patient_activity_id', new.patient_activity_id,
        'completion_percent', new.completion_percent,
        'event', 'created'
      )
    );
    RETURN new;
  END IF;

  IF (tg_op = 'UPDATE') THEN
    -- Só auditamos se o conteúdo cifrado mudou ou o percent mudou.
    -- Evita ruído de updated_at puro.
    IF (new.draft_encrypted IS DISTINCT FROM old.draft_encrypted)
       OR (new.completion_percent IS DISTINCT FROM old.completion_percent) THEN
      INSERT INTO public.audit_logs (
        actor_id, workspace_id, action, resource_type, resource_id, metadata
      ) VALUES (
        NULL,
        new.workspace_id,
        'activity.draft_saved',
        'activity_draft',
        new.id::text,
        jsonb_build_object(
          'patient_id', new.patient_id,
          'patient_activity_id', new.patient_activity_id,
          'completion_percent', new.completion_percent,
          'event', 'updated'
        )
      );
    END IF;
    RETURN new;
  END IF;

  IF (tg_op = 'DELETE') THEN
    INSERT INTO public.audit_logs (
      actor_id, workspace_id, action, resource_type, resource_id, metadata
    ) VALUES (
      NULL,
      old.workspace_id,
      'activity.draft_discarded',
      'activity_draft',
      old.id::text,
      jsonb_build_object(
        'patient_id', old.patient_id,
        'patient_activity_id', old.patient_activity_id,
        'completion_percent', old.completion_percent
      )
    );
    RETURN old;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_activity_draft ON public.activity_drafts;
CREATE TRIGGER trg_audit_activity_draft
  AFTER INSERT OR UPDATE OR DELETE ON public.activity_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_activity_draft_change();