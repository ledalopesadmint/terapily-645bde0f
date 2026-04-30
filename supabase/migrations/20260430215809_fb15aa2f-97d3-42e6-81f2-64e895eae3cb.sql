DO $$
DECLARE
  v_options jsonb := '[
    {"value": 0, "label_pt": "Nenhuma vez", "label_en": "Not at all"},
    {"value": 1, "label_pt": "Vários dias", "label_en": "Several days"},
    {"value": 2, "label_pt": "Mais da metade dos dias", "label_en": "More than half the days"},
    {"value": 3, "label_pt": "Quase todos os dias", "label_en": "Nearly every day"}
  ]'::jsonb;
  v_questions jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', item->>'id',
      'text', item->>'text_pt',
      'text_en', item->>'text_en',
      'options', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'value', (opt->>'value')::int,
            'label', opt->>'label_pt',
            'label_en', opt->>'label_en'
          )
        )
        FROM jsonb_array_elements(v_options) AS opt
      )
    )
    ORDER BY (item->>'order')::int
  )
  INTO v_questions
  FROM activity_catalog,
       jsonb_array_elements(config->'items') AS item
  WHERE slug = 'phq-9';

  UPDATE activity_catalog
  SET config = config
              || jsonb_build_object('questions', v_questions)
              || jsonb_build_object('introduction',
                  'Nas últimas duas semanas, com que frequência você foi incomodado(a) por algum dos problemas abaixo?')
  WHERE slug = 'phq-9';
END $$;

-- Sanity: garante que ficou OK
DO $$
DECLARE
  q_count int;
BEGIN
  SELECT jsonb_array_length(config->'questions')
    INTO q_count
    FROM activity_catalog
   WHERE slug = 'phq-9';
  IF q_count IS NULL OR q_count <> 9 THEN
    RAISE EXCEPTION 'PHQ-9 questions migration failed: got %', q_count;
  END IF;
END $$;