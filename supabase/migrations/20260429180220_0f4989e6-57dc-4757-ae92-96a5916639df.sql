-- 1. Função de purge: zera PHI cifrado e marca purged_at em pacientes
--    soft-deletados há mais de 30 dias. Mantém o registro (audit trail) mas
--    apaga TODO conteúdo identificável.
CREATE OR REPLACE FUNCTION public.purge_expired_patients()
RETURNS TABLE(purged_count integer, run_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_now   timestamptz := now();
  v_ids   uuid[];
BEGIN
  -- Seleciona ids elegíveis (soft-deleted há mais de 30d, ainda não purgados)
  SELECT array_agg(id), count(*)
    INTO v_ids, v_count
  FROM public.patients
  WHERE deleted_at IS NOT NULL
    AND purged_at IS NULL
    AND deleted_at < (v_now - interval '30 days');

  IF v_count = 0 OR v_ids IS NULL THEN
    RETURN QUERY SELECT 0, v_now;
    RETURN;
  END IF;

  -- Apaga PHI cifrado, zera campos de display e marca purged_at.
  -- display_name vira "[purged]" pra deixar claro na UI/audit que foi apagado.
  UPDATE public.patients
     SET full_name_encrypted = NULL,
         email_encrypted     = NULL,
         phone_encrypted     = NULL,
         display_name        = '[purged]',
         initials            = '••',
         tags                = ARRAY[]::text[],
         purged_at           = v_now,
         updated_at          = v_now
   WHERE id = ANY(v_ids);

  -- Audit log do purge (sem PHI, só ids e contagem).
  INSERT INTO public.audit_logs (
    actor_id, workspace_id, action, resource_type, resource_id, metadata
  )
  SELECT
    NULL,
    p.workspace_id,
    'patient.purged',
    'patient',
    p.id::text,
    jsonb_build_object(
      'purged_at', v_now,
      'deleted_at', p.deleted_at,
      'days_after_delete', extract(day from (v_now - p.deleted_at))::int
    )
  FROM public.patients p
  WHERE p.id = ANY(v_ids);

  -- Audit do batch como um todo.
  INSERT INTO public.audit_logs (
    actor_id, workspace_id, action, resource_type, metadata
  ) VALUES (
    NULL,
    NULL,
    'system.purge_batch',
    'patient',
    jsonb_build_object('count', v_count, 'run_at', v_now)
  );

  RETURN QUERY SELECT v_count, v_now;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_patients() FROM public, anon, authenticated;
-- service_role e postgres (usado pelo pg_cron) já têm acesso por default.

COMMENT ON FUNCTION public.purge_expired_patients IS
  'Purga PHI de pacientes soft-deletados há mais de 30 dias. Mantém registro com display_name=[purged] e audit trail. Idempotente (só toca quem ainda tem purged_at NULL).';

-- 2. Habilita extensões pra cron + http
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 3. Agenda execução diária às 03:15 UTC (~00:15 BRT, baixo tráfego).
--    Remove agendamento anterior se existir (idempotente).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-expired-patients-daily') THEN
    PERFORM cron.unschedule('purge-expired-patients-daily');
  END IF;
END $$;

SELECT cron.schedule(
  'purge-expired-patients-daily',
  '15 3 * * *',
  $$ SELECT public.purge_expired_patients(); $$
);