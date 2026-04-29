
-- 1. Adiciona purged_at em patients
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS purged_at timestamptz;

COMMENT ON COLUMN public.patients.purged_at IS
  'Quando o PHI cifrado foi apagado em definitivo (após 30 dias de soft-delete). Mantém audit trail.';

-- 2. Ajusta contagem: arquivados contam como vaga ocupada; só deleted_at libera.
CREATE OR REPLACE FUNCTION public.workspace_active_patient_count(_workspace_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select count(*)::int
  from public.patients
  where workspace_id = _workspace_id
    and deleted_at is null;
$$;

COMMENT ON FUNCTION public.workspace_active_patient_count IS
  'Conta pacientes que ocupam vaga no plano: ativos + arquivados. Excluídos (deleted_at) liberam vaga.';

-- 3. Política RLS: permite ver pacientes excluídos (mas não purgados) ao owner ou therapist assigned,
--    pra possibilitar a aba /patients/deleted e restauração na janela de 30 dias.
DROP POLICY IF EXISTS "patients: deleted read window" ON public.patients;
CREATE POLICY "patients: deleted read window"
ON public.patients
FOR SELECT
TO authenticated
USING (
  deleted_at IS NOT NULL
  AND purged_at IS NULL
  AND deleted_at > (now() - interval '30 days')
  AND is_workspace_member(workspace_id, auth.uid())
  AND (
    has_workspace_role(workspace_id, auth.uid(), 'owner'::workspace_role)
    OR assigned_therapist_id = auth.uid()
  )
);

-- 4. Função pra restaurar paciente dentro da janela de 30 dias.
--    SECURITY DEFINER pra contornar a policy de UPDATE (que exige deleted_at IS NULL implicitamente
--    pela read policy padrão e pelo fluxo existente).
CREATE OR REPLACE FUNCTION public.restore_patient(_patient_id uuid)
RETURNS public.patients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient public.patients;
BEGIN
  SELECT * INTO v_patient FROM public.patients WHERE id = _patient_id;

  IF v_patient.id IS NULL THEN
    RAISE EXCEPTION 'Paciente não encontrado.';
  END IF;

  -- Verifica permissão: precisa ser owner OU therapist assigned, e membro do workspace.
  IF NOT (
    is_workspace_member(v_patient.workspace_id, auth.uid())
    AND (
      has_workspace_role(v_patient.workspace_id, auth.uid(), 'owner'::workspace_role)
      OR v_patient.assigned_therapist_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Você não tem permissão pra restaurar este paciente.';
  END IF;

  IF v_patient.purged_at IS NOT NULL THEN
    RAISE EXCEPTION 'Este paciente foi apagado em definitivo e não pode ser restaurado.';
  END IF;

  IF v_patient.deleted_at IS NULL THEN
    RAISE EXCEPTION 'Este paciente não está excluído.';
  END IF;

  IF v_patient.deleted_at < (now() - interval '30 days') THEN
    RAISE EXCEPTION 'A janela de 30 dias para restauração expirou.';
  END IF;

  UPDATE public.patients
  SET deleted_at = NULL,
      updated_at = now()
  WHERE id = _patient_id
  RETURNING * INTO v_patient;

  RETURN v_patient;
END;
$$;

REVOKE ALL ON FUNCTION public.restore_patient(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.restore_patient(uuid) TO authenticated;

-- 5. Tabela clinic_waitlist
CREATE TABLE IF NOT EXISTS public.clinic_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  email text NOT NULL,
  projected_patient_count integer,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz,
  UNIQUE (workspace_id, email)
);

ALTER TABLE public.clinic_waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinic_waitlist: owner insert" ON public.clinic_waitlist;
CREATE POLICY "clinic_waitlist: owner insert"
ON public.clinic_waitlist
FOR INSERT
TO authenticated
WITH CHECK (
  has_workspace_role(workspace_id, auth.uid(), 'owner'::workspace_role)
  AND created_by = auth.uid()
);

DROP POLICY IF EXISTS "clinic_waitlist: owner read own" ON public.clinic_waitlist;
CREATE POLICY "clinic_waitlist: owner read own"
ON public.clinic_waitlist
FOR SELECT
TO authenticated
USING (
  has_workspace_role(workspace_id, auth.uid(), 'owner'::workspace_role)
);

DROP POLICY IF EXISTS "clinic_waitlist: admin read all" ON public.clinic_waitlist;
CREATE POLICY "clinic_waitlist: admin read all"
ON public.clinic_waitlist
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "clinic_waitlist: admin manage" ON public.clinic_waitlist;
CREATE POLICY "clinic_waitlist: admin manage"
ON public.clinic_waitlist
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_clinic_waitlist_workspace
  ON public.clinic_waitlist (workspace_id);
