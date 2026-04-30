-- ============================================================
-- M1: PHQ-9 + outras escalas com supported_modes correto
-- ============================================================

-- PHQ-9: in_session APENAS (Grupo 1 — item 9 = risco suicida)
UPDATE public.activity_catalog
SET
  status = 'published',
  config = jsonb_build_object(
    'supported_modes', jsonb_build_array('in_session'),
    'restricted_reason', 'Esta escala contém item de avaliação de risco suicida (item 9). Por segurança clínica, só pode ser aplicada presencialmente, com o terapeuta junto.',
    'estimated_minutes', 5,
    'instructions', jsonb_build_object(
      'pt', 'Nas últimas 2 semanas, com que frequência você foi incomodado(a) por algum dos seguintes problemas?',
      'en', 'Over the last 2 weeks, how often have you been bothered by any of the following problems?'
    ),
    'response_options', jsonb_build_array(
      jsonb_build_object('value', 0, 'label_pt', 'Nenhum dia',                'label_en', 'Not at all'),
      jsonb_build_object('value', 1, 'label_pt', 'Vários dias',               'label_en', 'Several days'),
      jsonb_build_object('value', 2, 'label_pt', 'Mais da metade dos dias',   'label_en', 'More than half the days'),
      jsonb_build_object('value', 3, 'label_pt', 'Quase todos os dias',       'label_en', 'Nearly every day')
    ),
    'items', jsonb_build_array(
      jsonb_build_object('id', 'q1', 'order', 1, 'text_pt', 'Pouco interesse ou prazer em fazer as coisas.',                                                                                                       'text_en', 'Little interest or pleasure in doing things.'),
      jsonb_build_object('id', 'q2', 'order', 2, 'text_pt', 'Sentir-se para baixo, deprimido(a) ou sem perspectiva.',                                                                                              'text_en', 'Feeling down, depressed, or hopeless.'),
      jsonb_build_object('id', 'q3', 'order', 3, 'text_pt', 'Dificuldade para pegar no sono ou continuar dormindo, ou dormir demais.',                                                                             'text_en', 'Trouble falling or staying asleep, or sleeping too much.'),
      jsonb_build_object('id', 'q4', 'order', 4, 'text_pt', 'Sentir-se cansado(a) ou com pouca energia.',                                                                                                          'text_en', 'Feeling tired or having little energy.'),
      jsonb_build_object('id', 'q5', 'order', 5, 'text_pt', 'Falta de apetite ou comer demais.',                                                                                                                   'text_en', 'Poor appetite or overeating.'),
      jsonb_build_object('id', 'q6', 'order', 6, 'text_pt', 'Sentir-se mal consigo mesmo(a) — ou achar que você é um fracasso ou que decepcionou sua família ou você mesmo(a).',                                   'text_en', 'Feeling bad about yourself — or that you are a failure or have let yourself or your family down.'),
      jsonb_build_object('id', 'q7', 'order', 7, 'text_pt', 'Dificuldade de concentração nas coisas, como ler o jornal ou ver televisão.',                                                                         'text_en', 'Trouble concentrating on things, such as reading the newspaper or watching television.'),
      jsonb_build_object('id', 'q8', 'order', 8, 'text_pt', 'Lentidão para se movimentar ou falar (a ponto das outras pessoas perceberem) — ou o oposto, estar agitado(a) ou inquieto(a) mais do que de costume.', 'text_en', 'Moving or speaking so slowly that other people could have noticed — or the opposite, being so fidgety or restless that you have been moving around a lot more than usual.'),
      jsonb_build_object('id', 'q9', 'order', 9, 'text_pt', 'Pensar em se ferir de alguma maneira ou que seria melhor estar morto(a).',                                                                            'text_en', 'Thoughts that you would be better off dead, or of hurting yourself in some way.', 'clinical_flag', 'suicidal_ideation', 'flag_threshold', 1)
    ),
    'scoring', jsonb_build_object(
      'type', 'sum',
      'max_per_item', 3,
      'questions', jsonb_build_array(
        jsonb_build_object('id', 'q1', 'weight', 1),
        jsonb_build_object('id', 'q2', 'weight', 1),
        jsonb_build_object('id', 'q3', 'weight', 1),
        jsonb_build_object('id', 'q4', 'weight', 1),
        jsonb_build_object('id', 'q5', 'weight', 1),
        jsonb_build_object('id', 'q6', 'weight', 1),
        jsonb_build_object('id', 'q7', 'weight', 1),
        jsonb_build_object('id', 'q8', 'weight', 1),
        jsonb_build_object('id', 'q9', 'weight', 1)
      )
    ),
    'severity_bands', jsonb_build_array(
      jsonb_build_object('min',  0, 'max',  4, 'label', 'minimal',           'label_pt', 'Mínima',          'label_en', 'Minimal'),
      jsonb_build_object('min',  5, 'max',  9, 'label', 'mild',              'label_pt', 'Leve',            'label_en', 'Mild'),
      jsonb_build_object('min', 10, 'max', 14, 'label', 'moderate',          'label_pt', 'Moderada',        'label_en', 'Moderate'),
      jsonb_build_object('min', 15, 'max', 19, 'label', 'moderately_severe', 'label_pt', 'Moderada a grave','label_en', 'Moderately severe'),
      jsonb_build_object('min', 20, 'max', 27, 'label', 'severe',            'label_pt', 'Grave',           'label_en', 'Severe')
    ),
    'reference', jsonb_build_object(
      'name', 'Patient Health Questionnaire-9 (PHQ-9)',
      'authors', 'Kroenke, Spitzer & Williams (2001)',
      'license', 'Public domain',
      'url', 'https://www.phqscreeners.com/'
    )
  ),
  updated_at = now()
WHERE slug = 'phq-9';

-- GAD-7: Grupo 2 — sem item de risco crítico, ambos modos liberados
UPDATE public.activity_catalog
SET
  config = config || jsonb_build_object('supported_modes', jsonb_build_array('in_session', 'shared_link')),
  updated_at = now()
WHERE slug = 'gad-7';

-- Respiração 4-7-8 / Registro de pensamentos / Ancoragem 5-4-3-2-1: Grupo 3 — homework friendly
UPDATE public.activity_catalog
SET
  config = config || jsonb_build_object('supported_modes', jsonb_build_array('in_session', 'shared_link')),
  updated_at = now()
WHERE slug IN ('respiracao-4-7-8', 'registro-pensamentos-3-colunas', 'ancoragem-5-4-3-2-1');

-- ============================================================
-- M2: scheduled_applications
-- ============================================================

CREATE TYPE public.scheduled_application_status AS ENUM (
  'pending',
  'completed',
  'skipped',
  'cancelled'
);

CREATE TABLE public.scheduled_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  activity_id uuid NOT NULL,
  scheduled_by uuid NOT NULL,
  scheduled_for_date date NOT NULL,
  status public.scheduled_application_status NOT NULL DEFAULT 'pending',
  completed_response_id uuid,
  notes text,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_scheduled_apps_workspace_date
  ON public.scheduled_applications (workspace_id, scheduled_for_date)
  WHERE status = 'pending';

CREATE INDEX idx_scheduled_apps_patient
  ON public.scheduled_applications (patient_id, scheduled_for_date DESC);

CREATE INDEX idx_scheduled_apps_scheduled_by
  ON public.scheduled_applications (scheduled_by, scheduled_for_date DESC);

ALTER TABLE public.scheduled_applications ENABLE ROW LEVEL SECURITY;

-- Read: qualquer membro do workspace; admin lê tudo
CREATE POLICY "scheduled_apps: workspace read"
ON public.scheduled_applications
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    is_workspace_member(workspace_id, auth.uid())
    AND (
      has_workspace_role(workspace_id, auth.uid(), 'owner'::workspace_role)
      OR EXISTS (
        SELECT 1 FROM public.patients p
        WHERE p.id = scheduled_applications.patient_id
          AND p.workspace_id = scheduled_applications.workspace_id
          AND p.assigned_therapist_id = auth.uid()
      )
    )
  )
);

-- Insert: owner ou terapeuta responsável pelo paciente
CREATE POLICY "scheduled_apps: workspace insert"
ON public.scheduled_applications
FOR INSERT
TO authenticated
WITH CHECK (
  is_workspace_member(workspace_id, auth.uid())
  AND scheduled_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = scheduled_applications.patient_id
      AND p.workspace_id = scheduled_applications.workspace_id
      AND p.deleted_at IS NULL
      AND (
        p.assigned_therapist_id = auth.uid()
        OR has_workspace_role(p.workspace_id, auth.uid(), 'owner'::workspace_role)
      )
  )
);

-- Update: quem agendou ou owner
CREATE POLICY "scheduled_apps: workspace update"
ON public.scheduled_applications
FOR UPDATE
TO authenticated
USING (
  is_workspace_member(workspace_id, auth.uid())
  AND (
    scheduled_by = auth.uid()
    OR has_workspace_role(workspace_id, auth.uid(), 'owner'::workspace_role)
  )
)
WITH CHECK (
  is_workspace_member(workspace_id, auth.uid())
  AND (
    scheduled_by = auth.uid()
    OR has_workspace_role(workspace_id, auth.uid(), 'owner'::workspace_role)
  )
);

-- updated_at trigger
CREATE TRIGGER trg_scheduled_apps_updated_at
BEFORE UPDATE ON public.scheduled_applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit trigger
CREATE OR REPLACE FUNCTION public.audit_scheduled_application_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (tg_op = 'INSERT') THEN
    INSERT INTO public.audit_logs (
      actor_id, workspace_id, action, resource_type, resource_id, metadata
    ) VALUES (
      auth.uid(),
      new.workspace_id,
      'scheduled_application.created',
      'scheduled_application',
      new.id::text,
      jsonb_build_object(
        'patient_id', new.patient_id,
        'activity_id', new.activity_id,
        'scheduled_for_date', new.scheduled_for_date
      )
    );
    RETURN new;
  END IF;

  IF (tg_op = 'UPDATE') THEN
    IF (new.status IS DISTINCT FROM old.status) THEN
      INSERT INTO public.audit_logs (
        actor_id, workspace_id, action, resource_type, resource_id, metadata
      ) VALUES (
        auth.uid(),
        new.workspace_id,
        'scheduled_application.status_changed',
        'scheduled_application',
        new.id::text,
        jsonb_build_object(
          'from', old.status,
          'to', new.status,
          'patient_id', new.patient_id,
          'response_id', new.completed_response_id
        )
      );
    END IF;
    RETURN new;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_scheduled_apps_audit
AFTER INSERT OR UPDATE ON public.scheduled_applications
FOR EACH ROW EXECUTE FUNCTION public.audit_scheduled_application_change();
