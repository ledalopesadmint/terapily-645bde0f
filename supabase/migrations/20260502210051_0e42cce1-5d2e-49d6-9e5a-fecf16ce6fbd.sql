
-- Atomic increment for platform_analytics (used by error tracker)
CREATE OR REPLACE FUNCTION public.increment_platform_analytics(
  p_date date,
  p_hour smallint,
  p_metric text,
  p_dimension text DEFAULT 'total'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.platform_analytics (date, hour_bucket, day_of_week, metric, dimension, value)
  VALUES (
    p_date,
    p_hour,
    EXTRACT(DOW FROM p_date)::smallint,
    p_metric,
    p_dimension,
    1
  )
  ON CONFLICT (date, hour_bucket, metric, dimension)
  DO UPDATE SET value = platform_analytics.value + 1;
END;
$$;
