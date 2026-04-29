-- Tabela de histórico de destaques do acervo.
-- Necessária pra responder "atividades que nunca foram destaque" no painel
-- de insights do admin, já que activity_catalog.is_featured é sobrescrito
-- a cada troca.
CREATE TABLE IF NOT EXISTS public.featured_activity_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL,
  set_by uuid,
  set_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS featured_history_activity_idx
  ON public.featured_activity_history (activity_id);
CREATE INDEX IF NOT EXISTS featured_history_set_at_idx
  ON public.featured_activity_history (set_at DESC);

ALTER TABLE public.featured_activity_history ENABLE ROW LEVEL SECURITY;

-- Apenas admin lê. Insert é feito via server function com service role,
-- então não precisamos de policy de INSERT pra usuários autenticados.
CREATE POLICY "featured_history: admin read"
  ON public.featured_activity_history
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));