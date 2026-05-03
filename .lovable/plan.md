
# DragDropRunner — Player do arquétipo `drag_drop`

Completar o único arquétipo que ainda não tem runner implementado e já tem atividade no seed (CBT-03 Distorções Cognitivas). Segue o mesmo padrão dos runners existentes (BreathingRunner, GuidedScriptRunner, FormRunner).

---

## O que será construído

### 1. DragDropRunner com 3 sub-modos (via config JSON)

**`card_sort`** -- Arrastar cards em colunas/categorias
- Exemplo: CBT-03 (Distorções Cognitivas) -- pensamentos em categorias como "Catastrofização", "Leitura mental", "Generalização"
- Exemplo futuro: Values Card Sort (ACT) -- valores em "Muito importante" / "Importante" / "Pouco importante"

**`ranking_ladder`** -- Reordenar cards verticalmente por intensidade
- Exemplo: Exposure Hierarchy -- ordenar situações de menor a maior ansiedade
- Drag vertical, posição = rank

**`cycle_builder`** -- Posicionar cards em slots de um ciclo visual
- Exemplo: Ciclo de Beck -- preencher Situacao > Pensamento > Emocao > Corpo > Comportamento
- Slots fixos dispostos em círculo/fluxo, paciente arrasta ou seleciona

### 2. Visual diferenciado ("post-it" tátil)

- Cards com micro-rotacao aleatoria (+-2deg), sombra 3D sutil, bordas arredondadas
- Paleta Terracotta como tema padrão do arquétipo (diferencia visualmente de escalas Navy e worksheets Cream)
- Drop zones com feedback visual (highlight Sage ao arrastar sobre)
- Animacao de "encaixe" suave no drop
- Barra de progresso mostrando cards posicionados / total
- Zero gamificacao competitiva: sem score, sem timer, sem ranking

### 3. Dados estruturados no relatório

Response data salvo em `activity_responses.response_data`:
```json
{
  "mode": "card_sort",
  "placements": {
    "card-1": { "zone": "catastrophizing", "order": 0 },
    "card-2": { "zone": "mind-reading", "order": 1 }
  },
  "duration_seconds": 240
}
```

Compativel com os PDFs existentes (Worksheet Result PDF template) -- cada zona vira uma seção, cards listados dentro.

---

## Arquivos novos

```text
src/features/library/runners/drag_drop/
  DragDropRunner.tsx          -- Orchestrator: le config, renderiza sub-modo
  drag-drop-types.ts          -- DragDropConfig, CardDef, ZoneDef, etc
  CardSortLayout.tsx           -- Sub-modo card_sort (colunas)
  RankingLadderLayout.tsx      -- Sub-modo ranking_ladder (lista vertical)
  CycleBuilderLayout.tsx       -- Sub-modo cycle_builder (slots em ciclo)
  DraggableCard.tsx            -- Card visual "post-it" compartilhado
```

### Dependencia

`@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` -- lib leve, acessivel (keyboard drag), React 19 compativel.

---

## O que NAO muda

- Nenhuma tabela nova (usa `activity_catalog.config` JSONB existente + `activity_responses`)
- Nenhuma RLS nova (mesmo padrao de patient_activities)
- Consent layer ja obrigatorio pra todas atividades
- Fluxo magic link + in_session inalterado
- Relatorios PDF usam o template de worksheet existente

---

## Config JSON de exemplo (CBT-03 Distorcoes Cognitivas)

```json
{
  "mode": "card_sort",
  "instruction": "Arraste cada pensamento para a categoria que melhor descreve o padrao.",
  "cards": [
    { "id": "c1", "text": "Se eu errar, todo mundo vai me julgar." },
    { "id": "c2", "text": "Nada nunca da certo pra mim." },
    { "id": "c3", "text": "Eu sei que ele esta com raiva de mim." }
  ],
  "zones": [
    { "id": "catastrophizing", "label": "Catastrofizacao", "color": "#E8D5C4" },
    { "id": "overgeneralization", "label": "Generalizacao excessiva", "color": "#D4C5B9" },
    { "id": "mind-reading", "label": "Leitura mental", "color": "#C9B8A8" }
  ]
}
```

---

## Integracao com o fluxo existente

O DragDropRunner sera carregado nos mesmos pontos que o FormRunner:
- Rota `/p/$token` (magic link publico) -- detecta `archetype === 'drag_drop'` e renderiza DragDropRunner
- Modal in_session no `/patients/$id` -- mesmo padrao
- PatientPickerSheet no Acervo -- ja funciona pra qualquer arquetipo

---

## Ordem de implementacao

1. Instalar `@dnd-kit`
2. Criar types (`drag-drop-types.ts`)
3. Criar `DraggableCard.tsx` (componente visual)
4. Criar `CardSortLayout.tsx` (primeiro sub-modo, mais simples)
5. Criar `DragDropRunner.tsx` (orchestrator)
6. Integrar no `/p/$token` e modal in_session
7. Criar config JSON da CBT-03
8. Criar `RankingLadderLayout.tsx` e `CycleBuilderLayout.tsx`
