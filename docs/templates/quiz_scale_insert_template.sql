-- =============================================================================
-- Terapily — Template padrão de INSERT para nova escala quiz_scale
-- =============================================================================
--
-- INSTRUÇÕES:
-- 1. Duplique este arquivo e substitua todos os {{placeholders}}.
-- 2. Passe pela checklist de validação abaixo ANTES de executar.
-- 3. Insira SEMPRE com status = 'draft'. Publique só após preview funcional.
-- 4. Execute via migration tool ou psql com service role.
--
-- CHECKLIST DE VALIDAÇÃO — preencha antes de executar:
--
--   [ ] Licença segura? (public_domain / attribution / verificar com autor)
--   [ ] Exige apenas atribuição? Se sim, texto de atribuição preenchido?
--   [ ] Exige autorização formal do autor? Se sim, autorização obtida e arquivada?
--   [ ] Texto original dos itens mantido sem alteração indevida?
--   [ ] Instruções originais da escala preservadas (traduzidas se necessário)?
--   [ ] Scoring conferido item por item contra o manual da escala?
--   [ ] Há itens reversos? Se sim, listados em "reverse" + max_per_item correto?
--   [ ] Há subescalas/clusters? Se sim, mapeados em "clusters"?
--   [ ] Há clinical flags? Se sim, item_id + threshold + flag text corretos?
--   [ ] Severity bands conferidas contra publicação original?
--   [ ] PDF paciente mostra apenas devolutiva adequada (sem interpretação)?
--   [ ] PDF terapeuta mostra cálculo transparente (fórmula + item-by-item)?
--   [ ] Status inicial é 'draft'?
--   [ ] Preview foi testado antes de publicar?
--   [ ] Referência bibliográfica preenchida com DOI/URL quando disponível?
--
-- =============================================================================

INSERT INTO activity_catalog (
  slug,
  title,
  short_description,
  archetype,
  theme,
  category,
  status,
  config
) VALUES (
  '{{scale_slug}}',          -- ex: 'gad-7'
  '{{scale_title}}',         -- ex: 'GAD-7'
  '{{scale_short_description}}',  -- 1 frase, sem interpretação
  'quiz_scale',
  '{{theme}}',               -- sage | mauve | navy | cream | terracotta | sage-dark
  '{{category}}',            -- anxiety | depression | cbt | mindfulness | trauma | dbt | act | sleep | crisis
  'draft',                   -- SEMPRE draft. Publicar só após preview.
  '{
    "introduction": {
      "pt": "{{texto_introducao_pt}}",
      "en": "{{intro_text_en_optional}}"
    },

    "instructions": {
      "pt": "{{instrucao_original_ou_adaptada_com_atribuicao}}",
      "en": "{{english_instruction_optional}}"
    },

    "estimated_minutes": {{estimated_minutes}},

    "supported_modes": ["in_session", "shared_link"],

    "questions": [
      {
        "id": "q1",
        "text": "{{texto_do_item_1}}",
        "options": [
          { "value": 0, "label": "{{opcao_0}}" },
          { "value": 1, "label": "{{opcao_1}}" },
          { "value": 2, "label": "{{opcao_2}}" },
          { "value": 3, "label": "{{opcao_3}}" }
        ]
      }
    ],

    "items": [
      {
        "id": "q1",
        "clinical_flag": false,
        "flag_threshold": null
      }
    ],

    "scoring": {
      "type": "sum",
      "questions": [
        { "id": "q1" }
      ],
      "reverse": [],
      "max_per_item": 3,
      "clusters": {}
    },

    "severity_bands": [
      { "min": 0, "max": 4, "label": "{{faixa_1}}" },
      { "min": 5, "max": 9, "label": "{{faixa_2}}" }
    ],

    "references": [
      {
        "label": "{{referencia_bibliografica}}",
        "url": "{{url_opcional_doi}}"
      }
    ],

    "license": {
      "type": "{{public_domain|attribution|required_permission|other}}",
      "text": "{{texto_de_licenca_ou_atribuicao}}",
      "requires_attribution": true,
      "requires_permission": false
    }
  }'::jsonb
);

-- Após inserir, teste:
-- 1. Verifique no admin que a escala aparece como draft
-- 2. Ative preview via feature flag ou publique
-- 3. Teste fluxo in_session completo (prescrever → abrir player → submeter)
-- 4. Teste fluxo shared_link se aplicável (gerar link → abrir → submeter)
-- 5. Verifique PDF paciente e PDF terapeuta
-- 6. Verifique clinical flags se configurados
-- 7. Só então altere status para 'published'
