
ALTER TABLE public.patient_activities DROP CONSTRAINT patient_activities_link_requires_hash;

ALTER TABLE public.patient_activities ADD CONSTRAINT patient_activities_link_requires_hash CHECK (
  -- in_session: never has token
  (delivery_mode = 'in_session' AND token_hash IS NULL AND token_expires_at IS NULL)
  OR
  -- shared_link/both with active token (pending/in_progress)
  (delivery_mode IN ('shared_link', 'both') AND token_hash IS NOT NULL AND token_expires_at IS NOT NULL)
  OR
  -- shared_link/both after completion/expiry/revocation: token burned
  (delivery_mode IN ('shared_link', 'both') AND token_hash IS NULL AND status IN ('completed', 'expired', 'revoked'))
);
