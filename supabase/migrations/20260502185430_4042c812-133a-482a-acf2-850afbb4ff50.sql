
INSERT INTO activity_catalog (slug, title, short_description, archetype, theme, category, status, is_featured, config)
VALUES (
  'respiracao-quadrada',
  'Respiração Quadrada',
  'Quatro tempos iguais — inspira, segura, expira, segura. Ritmo militar adaptado pra clínica.',
  'guided_timer',
  'sage_dark',
  'mindfulness',
  'published',
  false,
  '{
    "runner": "breathing",
    "cycles": 4,
    "duration_min": 4,
    "phases": [
      { "id": "inhale",  "label": "Inspire",  "durationSec": 4, "animation": "grow"   },
      { "id": "hold1",   "label": "Segure",   "durationSec": 4, "animation": "hold"   },
      { "id": "exhale",  "label": "Expire",   "durationSec": 4, "animation": "shrink" },
      { "id": "hold2",   "label": "Segure",   "durationSec": 4, "animation": "hold"   }
    ],
    "sounds": { "bell": true, "breathGuide": true },
    "spotifyUrl": "",
    "introduction": "A respiração quadrada (box breathing) é usada por militares, atletas e profissionais de saúde para recuperar o controle em momentos de estresse agudo.\n\nO método é simples: inspire contando até 4, segure por 4, expire por 4, e segure novamente por 4. Os quatro tempos iguais criam um ritmo previsível que sinaliza segurança ao seu sistema nervoso.\n\nVocê vai completar 4 ciclos. A animação guia o ritmo — basta acompanhar.\n\nEncontre uma posição confortável e, quando estiver pronto, pressione Iniciar.",
    "disclaimer": "Esta técnica não substitui tratamento profissional. Se sentir tontura, respire normalmente e interrompa o exercício."
  }'::jsonb
);
