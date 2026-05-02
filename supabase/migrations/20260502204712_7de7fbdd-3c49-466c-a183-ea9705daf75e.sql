-- Tabela de analytics desidentificados da plataforma
CREATE TABLE public.platform_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  hour_bucket smallint,
  day_of_week smallint,
  metric text NOT NULL,
  dimension text NOT NULL DEFAULT 'total',
  value integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_analytics_hour_check CHECK (hour_bucket IS NULL OR (hour_bucket >= 0 AND hour_bucket <= 23)),
  CONSTRAINT platform_analytics_dow_check CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6)),
  UNIQUE(date, hour_bucket, metric, dimension)
);

-- Indexes for dashboard queries
CREATE INDEX idx_platform_analytics_date ON public.platform_analytics (date DESC);
CREATE INDEX idx_platform_analytics_metric ON public.platform_analytics (metric, date DESC);

ALTER TABLE public.platform_analytics ENABLE ROW LEVEL SECURITY;

-- Admin-only read
CREATE POLICY "platform_analytics: admin read"
  ON public.platform_analytics FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Deny all client writes
CREATE POLICY "platform_analytics: deny insert"
  ON public.platform_analytics FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY "platform_analytics: deny update"
  ON public.platform_analytics FOR UPDATE TO authenticated
  USING (false);

CREATE POLICY "platform_analytics: deny delete"
  ON public.platform_analytics FOR DELETE TO authenticated
  USING (false);