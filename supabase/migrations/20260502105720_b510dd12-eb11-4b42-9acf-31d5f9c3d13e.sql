
-- 1. Add 'declined' to patient_activity_status enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'declined'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'patient_activity_status')
  ) THEN
    ALTER TYPE patient_activity_status ADD VALUE 'declined';
  END IF;
END$$;

-- 2. Create activity_consents table
CREATE TABLE public.activity_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_activity_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  consent_version text NOT NULL DEFAULT '1.0',
  consent_text_hash text NOT NULL,
  accepted boolean NOT NULL,
  ip inet,
  user_agent text,
  decided_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- One consent record per patient_activity (immutable — no updates)
CREATE UNIQUE INDEX idx_activity_consents_pa ON public.activity_consents (patient_activity_id);

-- 3. RLS
ALTER TABLE public.activity_consents ENABLE ROW LEVEL SECURITY;

-- Workspace read (same pattern as activity_responses)
CREATE POLICY "activity_consents: workspace read"
  ON public.activity_consents
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      is_workspace_member(workspace_id, auth.uid())
      AND (
        has_workspace_role(workspace_id, auth.uid(), 'owner'::workspace_role)
        OR EXISTS (
          SELECT 1 FROM patients p
          WHERE p.id = activity_consents.patient_id
            AND p.workspace_id = activity_consents.workspace_id
            AND p.assigned_therapist_id = auth.uid()
        )
      )
    )
  );

-- No INSERT/UPDATE/DELETE from client — server functions only via supabaseAdmin

-- 4. Audit trigger for consent decisions
CREATE OR REPLACE FUNCTION public.audit_activity_consent_insert()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    actor_id, workspace_id, action, resource_type, resource_id, metadata
  ) VALUES (
    NULL,
    new.workspace_id,
    CASE WHEN new.accepted THEN 'activity.consent_accepted' ELSE 'activity.consent_declined' END,
    'activity_consent',
    new.id::text,
    jsonb_build_object(
      'patient_activity_id', new.patient_activity_id,
      'patient_id', new.patient_id,
      'consent_version', new.consent_version,
      'consent_text_hash', new.consent_text_hash
    )
  );
  RETURN new;
END;
$$;

CREATE TRIGGER trg_audit_activity_consent
  AFTER INSERT ON public.activity_consents
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_activity_consent_insert();
