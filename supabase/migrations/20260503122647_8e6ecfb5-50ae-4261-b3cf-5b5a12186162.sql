
-- Admin read-only access to all workspace tables for audit/legal defense.
-- Admin is exclusive to Leda (admin@terapily.com), enforced by unique partial index.
-- HIPAA permits processor access to PHI for health care operations and legal defense.

-- 1. patient_activities
CREATE POLICY "patient_activities: admin read all"
  ON public.patient_activities FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. activity_responses
CREATE POLICY "activity_responses: admin read all"
  ON public.activity_responses FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. activity_consents
CREATE POLICY "activity_consents: admin read all"
  ON public.activity_consents FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. activity_drafts
CREATE POLICY "activity_drafts: admin read all"
  ON public.activity_drafts FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. patients
CREATE POLICY "patients: admin read all"
  ON public.patients FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. ephemeral_activities
CREATE POLICY "ephemeral_activities: admin read all"
  ON public.ephemeral_activities FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 7. ephemeral_responses
CREATE POLICY "ephemeral_responses: admin read all"
  ON public.ephemeral_responses FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 8. workspaces
CREATE POLICY "workspaces: admin read all"
  ON public.workspaces FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 9. workspace_members
CREATE POLICY "workspace_members: admin read all"
  ON public.workspace_members FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 10. subscriptions
CREATE POLICY "subscriptions: admin read all"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 11. scheduled_applications (also missing admin read)
CREATE POLICY "scheduled_applications: admin read all"
  ON public.scheduled_applications FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 12. clinic_waitlist already has admin read — skip
-- 13. feature_flags — admin should also read all
CREATE POLICY "feature_flags: admin read all"
  ON public.feature_flags FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
