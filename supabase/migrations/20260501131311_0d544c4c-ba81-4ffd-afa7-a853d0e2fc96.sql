
ALTER TABLE public.activity_responses
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS acknowledged_by uuid DEFAULT NULL;
