-- Blindagem rígida do limite de pacientes em RESTORE e UNARCHIVE.
--
-- Contexto: enforce_patient_limit() só roda em INSERT. Restore (UPDATE
-- deleted_at=NULL) e unarchive (status active) escapavam, permitindo
-- estourar a cota do plano. Bug reproduzido: 22 ativos no Basic (max 20).
--
-- Estratégia: defesa em profundidade
--   1. Função SECURITY DEFINER `assert_patient_capacity` reutilizável.
--   2. restore_patient passa a chamá-la antes de zerar deleted_at.
--   3. Trigger BEFORE UPDATE pega qualquer outra rota (unarchive direto via
--      UPDATE, restore manual via SQL admin, etc).
--
-- Regra de contagem (mesma do enforce_patient_limit + plan.server.ts):
--   vagas ocupadas = pacientes onde deleted_at IS NULL
--   (ativos + arquivados contam; excluídos não contam)
--
-- Resultado: para restaurar com cota cheia, o terapeuta PRECISA primeiro
--   excluir um ativo/arquivado. Sem brecha.

-- ---------- 1. Helper ----------
CREATE OR REPLACE FUNCTION public.assert_patient_capacity(_workspace_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier            subscription_tier;
  v_max_patients    integer;
  v_current_count   integer;
  v_limits_override jsonb;
BEGIN
  SELECT tier, limits
    INTO v_tier, v_limits_override
    FROM public.subscriptions
   WHERE workspace_id = _workspace_id
   LIMIT 1;

  IF v_tier IS NULL THEN
    v_tier := 'trial'::subscription_tier;
    v_max_patients := 5;
  ELSE
    v_max_patients := CASE v_tier
      WHEN 'trial'    THEN 5
      WHEN 'solo'     THEN 5
      WHEN 'basic'    THEN 20
      WHEN 'practice' THEN 50
      WHEN 'clinic'   THEN NULL
      ELSE 5
    END;

    IF v_limits_override IS NOT NULL
       AND v_limits_override ? 'max_patients'
       AND jsonb_typeof(v_limits_override->'max_patients') = 'number' THEN
      v_max_patients := greatest(0, (v_limits_override->>'max_patients')::int);
    END IF;
  END IF;

  IF v_max_patients IS NULL THEN
    RETURN;
  END IF;

  SELECT count(*)::int
    INTO v_current_count
    FROM public.patients
   WHERE workspace_id = _workspace_id
     AND deleted_at IS NULL;

  IF v_current_count >= v_max_patients THEN
    RAISE EXCEPTION '__LIMIT_REACHED__:%:%', v_tier::text, v_max_patients
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

-- ---------- 2. restore_patient agora valida cota ----------
CREATE OR REPLACE FUNCTION public.restore_patient(_patient_id uuid)
RETURNS patients
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

  -- Cota rígida: restore ocupa vaga.
  PERFORM public.assert_patient_capacity(v_patient.workspace_id);

  UPDATE public.patients
  SET deleted_at = NULL,
      updated_at = now()
  WHERE id = _patient_id
  RETURNING * INTO v_patient;

  RETURN v_patient;
END;
$$;

-- ---------- 3. Trigger BEFORE UPDATE: defesa em profundidade ----------
-- Pega qualquer caminho que tente reativar um paciente excluído fora do RPC.
-- (Unarchive não muda deleted_at, então não dispara — e está correto:
-- arquivado já contava na cota.)
CREATE OR REPLACE FUNCTION public.enforce_patient_limit_on_restore()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só nos importa: paciente saindo de "excluído" pra "vivo".
  IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    PERFORM public.assert_patient_capacity(NEW.workspace_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_patient_limit_restore ON public.patients;
CREATE TRIGGER enforce_patient_limit_restore
  BEFORE UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_patient_limit_on_restore();