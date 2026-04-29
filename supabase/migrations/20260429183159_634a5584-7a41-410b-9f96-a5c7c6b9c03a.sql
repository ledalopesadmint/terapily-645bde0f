-- Defesa em profundidade: bloquear INSERT de paciente acima do limite do plano,
-- mesmo se alguém tentar inserir direto via Supabase client (fora do
-- createPatient server function).
--
-- Espelha a regra de createPatient:
--   - lê tier+max_patients da subscription do workspace
--   - se max_patients NULL → ilimitado (Clinic), nada a fazer
--   - conta patients com deleted_at IS NULL no mesmo workspace
--   - se count >= max → erro com prefixo __LIMIT_REACHED__:<tier>:<max>
--
-- A mensagem de erro é PII-safe (só tier e número). O audit log pra essa
-- tentativa bloqueada continua sendo gravado pela camada de aplicação
-- (createPatient já registra patient.limit_reached antes de lançar);
-- caller via SDK direto não terá audit, mas a tabela rejeita o INSERT
-- antes do trigger de audit_patient_change rodar.

create or replace function public.enforce_patient_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tier            subscription_tier;
  v_status          subscription_status;
  v_max_patients    integer;
  v_current_count   integer;
  v_limits_override jsonb;
begin
  -- Trigger só se aplica a INSERT (definido no CREATE TRIGGER), e só vale
  -- pra paciente novo "vivo". Restore via UPDATE não passa por aqui.
  if new.deleted_at is not null then
    return new;
  end if;

  -- Busca subscription. Mesma lógica de fallback do plan.server.ts:
  --   - se não houver subscription, tratamos como trial (max 5).
  --   - subscriptions.limits.max_patients sobrepõe o default do tier.
  select tier, status, limits
    into v_tier, v_status, v_limits_override
    from public.subscriptions
   where workspace_id = new.workspace_id
   limit 1;

  -- Se subscription cancelada/past_due, ainda aplicamos o limite do tier.
  -- Bloqueio comercial fica pra outra camada — aqui é só cota.
  if v_tier is null then
    v_tier := 'trial'::subscription_tier;
    v_max_patients := 5;
  else
    -- Defaults por tier (espelha TIER_LIMITS do plan.server.ts)
    v_max_patients := case v_tier
      when 'trial'    then 5
      when 'solo'     then 5
      when 'basic'    then 20
      when 'practice' then 50
      when 'clinic'   then null  -- ilimitado
      else 5
    end;

    -- Override por subscription (se houver entrada numérica não-negativa)
    if v_limits_override is not null
       and v_limits_override ? 'max_patients'
       and jsonb_typeof(v_limits_override->'max_patients') = 'number' then
      v_max_patients := greatest(0, (v_limits_override->>'max_patients')::int);
    end if;
  end if;

  -- Plano ilimitado → nada a checar
  if v_max_patients is null then
    return new;
  end if;

  -- Conta vagas ocupadas (ativos + arquivados; excluídos não contam)
  select count(*)::int
    into v_current_count
    from public.patients
   where workspace_id = new.workspace_id
     and deleted_at is null;

  if v_current_count >= v_max_patients then
    -- Mensagem PII-safe. Mesmo formato que createPatient lança pra UI
    -- conseguir abrir o modal contextual de upgrade/waitlist.
    raise exception '__LIMIT_REACHED__:%:%', v_tier::text, v_max_patients
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists patients_enforce_limit on public.patients;

create trigger patients_enforce_limit
  before insert on public.patients
  for each row
  execute function public.enforce_patient_limit();

comment on function public.enforce_patient_limit() is
  'Defesa em profundidade: bloqueia INSERT de paciente acima do limite do plano. Espelha createPatient. Mensagem de erro PII-safe (__LIMIT_REACHED__:<tier>:<max>).';
