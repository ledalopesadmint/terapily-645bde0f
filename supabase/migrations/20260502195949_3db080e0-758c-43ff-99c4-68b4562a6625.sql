-- Add consent tracking columns to habit_links
ALTER TABLE public.habit_links
  ADD COLUMN IF NOT EXISTS consent_accepted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS consent_ip INET DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS consent_user_agent TEXT DEFAULT NULL;