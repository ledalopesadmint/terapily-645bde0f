-- 1. Expandir subscription_tier: adicionar 'basic' e 'patient'
-- (mantém 'solo' como alias deprecado para não quebrar dados existentes)
ALTER TYPE public.subscription_tier ADD VALUE IF NOT EXISTS 'basic';
ALTER TYPE public.subscription_tier ADD VALUE IF NOT EXISTS 'patient';

-- 2. Expandir subscription_status: adicionar 'expired'
ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'expired';

-- 3. Adicionar coluna limits jsonb em subscriptions
-- (apenas documentação/flexibilidade — segurança REAL deve vir de RLS/server functions)
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS limits jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.subscriptions.limits IS
  'Limites declarativos do plano (ex: max_therapists, max_patients). NUNCA usar como fonte única de verdade para segurança — sempre validar no backend/RLS.';