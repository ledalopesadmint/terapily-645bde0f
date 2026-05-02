UPDATE public.activity_catalog
SET config = jsonb_build_object(
  'runner', 'breathing',
  'cycles', 4,
  'phases', jsonb_build_array(
    jsonb_build_object('id', 'inhale', 'label', 'Inspire', 'durationSec', 4, 'animation', 'grow'),
    jsonb_build_object('id', 'hold', 'label', 'Segure', 'durationSec', 7, 'animation', 'hold'),
    jsonb_build_object('id', 'exhale', 'label', 'Expire', 'durationSec', 8, 'animation', 'shrink')
  ),
  'sounds', jsonb_build_object('bell', true, 'breathGuide', true),
  'spotifyUrl', '',
  'duration_min', 5,
  'introduction', E'A respiração 4-7-8 é uma técnica desenvolvida pelo Dr. Andrew Weil, baseada em práticas ancestrais de pranayama. Ela ativa diretamente o sistema nervoso parassimpático — a parte do seu corpo responsável por acalmar.\n\nO exercício é simples: inspire pelo nariz contando até 4, segure a respiração contando até 7, e expire lentamente pela boca contando até 8. A proporção 4:7:8 importa mais do que a velocidade.\n\nVocê vai completar 4 ciclos completos. A animação vai guiar seu ritmo — basta acompanhar o círculo na tela.\n\nEncontre uma posição confortável, sentado com as costas apoiadas. Quando estiver pronto, pressione Iniciar.',
  'disclaimer', 'Esta técnica não substitui tratamento profissional. Se sentir tontura, respire normalmente e interrompa o exercício.'
)
WHERE slug = 'respiracao-4-7-8';