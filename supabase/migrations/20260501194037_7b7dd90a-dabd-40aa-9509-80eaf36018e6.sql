UPDATE activity_catalog
SET config = jsonb_set(
  config,
  '{introduction}',
  '"Este questionário é utilizado para identificar a frequência de sintomas relacionados ao humor nas últimas duas semanas.\n\nNão existe resposta certa ou errada. O objetivo é registrar, com precisão, como você tem se sentido recentemente.\n\nSuas respostas ajudam a organizar informações importantes para o acompanhamento terapêutico e serão analisadas junto com seu terapeuta.\n\nResponda com base na sua experiência real, mesmo que as respostas pareçam repetitivas ou difíceis de definir."'::jsonb
)
WHERE slug = 'phq-9';