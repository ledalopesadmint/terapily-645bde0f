-- 1. Garantir no máximo 1 admin no sistema inteiro.
-- Índice único parcial: só pode existir UMA linha em user_roles com role = 'admin'.
-- Qualquer INSERT de um segundo admin é rejeitado pelo banco — defesa em profundidade,
-- mesmo que policy/UI/bug futuro tentem promover outro usuário.
create unique index if not exists user_roles_single_admin_idx
  on public.user_roles ((role))
  where role = 'admin';

-- 2. Promover admin@terapily.com a admin, se a conta existir.
-- Idempotente: se já estiver admin, não faz nada. Se a conta não existir ainda,
-- também não faz nada (Leda precisa criar via /signup primeiro e rodar de novo).
do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id
  from auth.users
  where lower(email) = 'admin@terapily.com'
  limit 1;

  if v_user_id is null then
    raise notice 'Conta admin@terapily.com ainda não existe — crie via /signup e re-rode.';
  else
    insert into public.user_roles (user_id, role)
    values (v_user_id, 'admin')
    on conflict (user_id, role) do nothing;
    raise notice 'admin@terapily.com promovido a admin (user_id: %)', v_user_id;
  end if;
end $$;