-- 1) Colunas Stripe em subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_method_brand text,
  ADD COLUMN IF NOT EXISTS stripe_payment_method_last4 text;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_stripe_subscription_id_key
  ON public.subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS subscriptions_stripe_customer_id_idx
  ON public.subscriptions (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- 2) stripe_events (idempotência)
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id text PRIMARY KEY,
  type text NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL
);

ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

-- Sem políticas: nenhum usuário client pode ler/escrever. Apenas service_role.
-- (admin pode inspecionar via tabela auditável se precisar)

-- 3) stripe_products (catálogo de price_ids)
CREATE TABLE IF NOT EXISTS public.stripe_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_price_id text NOT NULL UNIQUE,
  stripe_product_id text NOT NULL,
  tier public.subscription_tier NOT NULL,
  nickname text NOT NULL,
  unit_amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  interval text NOT NULL DEFAULT 'month',
  active boolean NOT NULL DEFAULT true,
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stripe_products: authenticated read active"
  ON public.stripe_products
  FOR SELECT
  TO authenticated
  USING (active = true);

CREATE POLICY "stripe_products: admin manage"
  ON public.stripe_products
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER stripe_products_updated_at
  BEFORE UPDATE ON public.stripe_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();