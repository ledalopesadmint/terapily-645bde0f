-- ============================================================================
-- Sexta da S1 — Audit trigger em subscriptions
-- ============================================================================
-- Toda mudança de status (trialing → active → canceled etc) ou tier (solo →
-- team etc) deixa rastro em audit_logs, sem expor PII.
-- ============================================================================

create or replace function public.audit_subscription_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- INSERT: assinatura nova (criada pelo handle_new_user ou checkout)
  if (tg_op = 'INSERT') then
    insert into public.audit_logs (
      actor_id, workspace_id, action, resource_type, resource_id, metadata
    ) values (
      auth.uid(),
      new.workspace_id,
      'subscription.created',
      'subscription',
      new.id::text,
      jsonb_build_object(
        'provider', new.provider,
        'tier', new.tier,
        'status', new.status
      )
    );
    return new;
  end if;

  -- UPDATE: registra só se status ou tier mudou (evita ruído de updated_at)
  if (tg_op = 'UPDATE') then
    if (new.status is distinct from old.status) then
      insert into public.audit_logs (
        actor_id, workspace_id, action, resource_type, resource_id, metadata
      ) values (
        auth.uid(),
        new.workspace_id,
        'subscription.status_changed',
        'subscription',
        new.id::text,
        jsonb_build_object(
          'from', old.status,
          'to', new.status,
          'provider', new.provider
        )
      );
    end if;

    if (new.tier is distinct from old.tier) then
      insert into public.audit_logs (
        actor_id, workspace_id, action, resource_type, resource_id, metadata
      ) values (
        auth.uid(),
        new.workspace_id,
        'subscription.tier_changed',
        'subscription',
        new.id::text,
        jsonb_build_object(
          'from', old.tier,
          'to', new.tier,
          'provider', new.provider
        )
      );
    end if;

    return new;
  end if;

  return new;
end;
$$;

-- Restringir EXECUTE: só o owner do schema (postgres) precisa, trigger roda
-- com privilégios do definer independente disso.
revoke all on function public.audit_subscription_change() from public, anon, authenticated;

-- Drop trigger se já existir (idempotência)
drop trigger if exists subscriptions_audit_trigger on public.subscriptions;

create trigger subscriptions_audit_trigger
  after insert or update on public.subscriptions
  for each row
  execute function public.audit_subscription_change();

comment on function public.audit_subscription_change() is
  'Registra em audit_logs toda mudança de status ou tier em subscriptions. SECURITY DEFINER: única forma de gravar audit_logs (INSERT está REVOKED para authenticated/anon).';