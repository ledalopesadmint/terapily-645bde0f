UPDATE activity_catalog
SET
  status = 'published',
  config = jsonb_set(
    config,
    '{}',
    '{
      "code": "TRA-02",
      "duration_min": 6,
      "disclaimer": "Exercício de regulação. Pode evocar memórias difíceis. Use com supervisão clínica em pacientes com trauma ativo.",
      "supported_modes": ["in_session", "shared_link"],
      "items_implemented": true,
      "preview_only": false,
      "introduction": "Este exercício usa seus cinco sentidos para te trazer de volta ao presente. Não existe forma certa ou errada de fazer — apenas observe o que percebe ao seu redor, sem julgamento.\n\nVá no seu ritmo. Se algum sentido for difícil, pule para o próximo.\n\nQuando estiver pronto, vamos começar.",
      "steps": [
        {
          "id": "step_see",
          "title": "5 coisas que você vê",
          "instruction": "Olhe ao redor com calma. Nomeie 5 coisas que você consegue ver agora — podem ser objetos, cores, formas, sombras. Não precisa ser nada especial.",
          "durationSec": 60,
          "hasReflection": true,
          "reflectionLabel": "O que você viu?",
          "reflectionPlaceholder": "Ex: A janela, uma caneta azul, a luz no teto, minha mão, o tapete..."
        },
        {
          "id": "step_touch",
          "title": "4 coisas que você pode tocar",
          "instruction": "Toque em 4 superfícies ao seu redor. Preste atenção na textura, temperatura e pressão. Nomeie cada uma.",
          "durationSec": 60,
          "hasReflection": true,
          "reflectionLabel": "O que você tocou?",
          "reflectionPlaceholder": "Ex: A cadeira (dura e fria), meu joelho (morno), o tecido da roupa (macio)..."
        },
        {
          "id": "step_hear",
          "title": "3 coisas que você ouve",
          "instruction": "Feche os olhos por um momento, se quiser. Escute com atenção. Identifique 3 sons — próximos ou distantes.",
          "durationSec": 45,
          "hasReflection": true,
          "reflectionLabel": "O que você ouviu?",
          "reflectionPlaceholder": "Ex: O ar condicionado, passos no corredor, minha própria respiração..."
        },
        {
          "id": "step_smell",
          "title": "2 coisas que você sente o cheiro",
          "instruction": "Respire fundo pelo nariz. Identifique 2 cheiros — pode ser sutil. Se não perceber nada, aproxime-se de algo (sua manga, um objeto) e cheire com atenção.",
          "durationSec": 30,
          "hasReflection": true,
          "reflectionLabel": "O que você sentiu?",
          "reflectionPlaceholder": "Ex: O café que tomei mais cedo, o sabonete na minha mão..."
        },
        {
          "id": "step_taste",
          "title": "1 coisa que você sente o gosto",
          "instruction": "Preste atenção ao que sente na sua boca agora. Pode ser o gosto residual de algo que bebeu ou comeu, ou simplesmente a sensação da sua saliva. Se tiver água por perto, dê um gole pequeno e preste atenção.",
          "durationSec": 30,
          "hasReflection": true,
          "reflectionLabel": "O que você notou?",
          "reflectionPlaceholder": "Ex: Gosto de menta do creme dental, a água..."
        },
        {
          "id": "step_close",
          "title": "Volta ao presente",
          "instruction": "Respire fundo três vezes. Você está aqui, neste momento, neste lugar. Seus sentidos te trouxeram de volta. Quando estiver pronto, abra os olhos se estiverem fechados.",
          "durationSec": 30,
          "hasReflection": false
        }
      ]
    }'::jsonb
  )
WHERE slug = 'ancoragem-5-4-3-2-1';