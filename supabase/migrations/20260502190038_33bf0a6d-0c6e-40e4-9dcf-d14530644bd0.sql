UPDATE public.activity_catalog
SET
  status = 'published',
  category = 'mindfulness',
  archetype = 'guided_timer',
  config = jsonb_build_object(
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
    'supported_modes', jsonb_build_array('in_session', 'shared_link', 'both'),
    'items_implemented', true,
    'preview_only', false,
    'introduction', E'A respiração 4-7-8 é uma técnica desenvolvida pelo Dr. Andrew Weil, baseada em práticas ancestrais de pranayama. Ela ativa diretamente o sistema nervoso parassimpático — a parte do seu corpo responsável por acalmar.\n\nO exercício é simples: inspire pelo nariz contando até 4, segure a respiração contando até 7, e expire lentamente pela boca contando até 8. A proporção 4:7:8 importa mais do que a velocidade.\n\nVocê vai completar 4 ciclos completos. A animação vai guiar seu ritmo — basta acompanhar o círculo na tela.\n\nEncontre uma posição confortável, sentado com as costas apoiadas. Quando estiver pronto, pressione Iniciar.',
    'disclaimer', 'Esta técnica não substitui tratamento profissional. Se sentir tontura, respire normalmente e interrompa o exercício.'
  )
WHERE slug = 'respiracao-4-7-8';

UPDATE public.activity_catalog
SET
  status = 'published',
  category = 'mindfulness',
  archetype = 'guided_script',
  config = jsonb_build_object(
    'code', 'TRA-02',
    'duration_min', 6,
    'disclaimer', 'Exercício de regulação. Pode evocar memórias difíceis. Use com supervisão clínica em pacientes com trauma ativo.',
    'supported_modes', jsonb_build_array('in_session', 'shared_link', 'both'),
    'items_implemented', true,
    'preview_only', false,
    'introduction', E'Este exercício usa seus cinco sentidos para te trazer de volta ao presente. Não existe forma certa ou errada de fazer — apenas observe o que percebe ao seu redor, sem julgamento.\n\nVá no seu ritmo. Se algum sentido for difícil, pule para o próximo.\n\nQuando estiver pronto, vamos começar.',
    'steps', jsonb_build_array(
      jsonb_build_object(
        'id', 'step_see',
        'title', '5 coisas que você vê',
        'instruction', 'Olhe ao redor com calma. Nomeie 5 coisas que você consegue ver agora — podem ser objetos, cores, formas, sombras. Não precisa ser nada especial.',
        'durationSec', 60,
        'hasReflection', true,
        'reflectionLabel', 'O que você viu?',
        'reflectionPlaceholder', 'Ex: A janela, uma caneta azul, a luz no teto, minha mão, o tapete...'
      ),
      jsonb_build_object(
        'id', 'step_touch',
        'title', '4 coisas que você pode tocar',
        'instruction', 'Toque em 4 superfícies ao seu redor. Preste atenção na textura, temperatura e pressão. Nomeie cada uma.',
        'durationSec', 60,
        'hasReflection', true,
        'reflectionLabel', 'O que você tocou?',
        'reflectionPlaceholder', 'Ex: A cadeira dura e fria, meu joelho morno, o tecido da roupa macio...'
      ),
      jsonb_build_object(
        'id', 'step_hear',
        'title', '3 coisas que você ouve',
        'instruction', 'Feche os olhos por um momento, se quiser. Escute com atenção. Identifique 3 sons — próximos ou distantes.',
        'durationSec', 45,
        'hasReflection', true,
        'reflectionLabel', 'O que você ouviu?',
        'reflectionPlaceholder', 'Ex: O ar condicionado, passos no corredor, minha própria respiração...'
      ),
      jsonb_build_object(
        'id', 'step_smell',
        'title', '2 coisas que você sente o cheiro',
        'instruction', 'Respire fundo pelo nariz. Identifique 2 cheiros — pode ser sutil. Se não perceber nada, aproxime-se de algo e cheire com atenção.',
        'durationSec', 30,
        'hasReflection', true,
        'reflectionLabel', 'O que você sentiu?',
        'reflectionPlaceholder', 'Ex: O café que tomei mais cedo, o sabonete na minha mão...'
      ),
      jsonb_build_object(
        'id', 'step_taste',
        'title', '1 coisa que você sente o gosto',
        'instruction', 'Preste atenção ao que sente na sua boca agora. Pode ser o gosto residual de algo que bebeu ou comeu, ou simplesmente a sensação da sua saliva. Se tiver água por perto, dê um gole pequeno e preste atenção.',
        'durationSec', 30,
        'hasReflection', true,
        'reflectionLabel', 'O que você notou?',
        'reflectionPlaceholder', 'Ex: Gosto de menta do creme dental, a água...'
      ),
      jsonb_build_object(
        'id', 'step_close',
        'title', 'Volta ao presente',
        'instruction', 'Respire fundo três vezes. Você está aqui, neste momento, neste lugar. Seus sentidos te trouxeram de volta. Quando estiver pronto, abra os olhos se estiverem fechados.',
        'durationSec', 30,
        'hasReflection', false
      )
    )
  )
WHERE slug = 'ancoragem-5-4-3-2-1';