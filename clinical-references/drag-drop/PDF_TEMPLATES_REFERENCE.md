# Drag & Drop Result PDF — Template Reference

> **Template TRAVADO** — Aprovado pela Leda em 2026-05-03.
> Qualquer alteração requer aprovação explícita.

## Arquivos de implementação

| Arquivo | Função |
|---------|--------|
| `src/features/activities/drag-drop-result-pdf.server.ts` | `buildDragDropResultPDF()` — lógica de geração |
| `src/features/activities/drag-drop-result-pdf.functions.ts` | Server functions autenticadas (patient + therapist) |
| `src/features/activities/pdf-brand-assets.server.ts` | `ICON_PNG_B64` + `WATERMARK_PNG_B64` — ÚNICO source de assets |

## Duas variantes

### 1. Patient Result PDF

Documento visual e motivacional, sem jargão clínico.

**Estrutura de páginas:**

1. **Header Navy** — icon squircle real + wordmark "terapily." em Cream
2. **Título**: "Clinical Activity Record" (Times Bold 18pt, Navy)
3. **Subtítulo**: nome da atividade em itálico (Times Italic 10pt, Charcoal)
4. **Info box** (Cream #F8F6F2, rounded):
   - Patient, Activity, Sub-mode, Completed, Delivery
5. **Card Placement Results** (header Sage com texto branco):
   - Zonas com bullets dos cards atribuídos
   - Cores por zona: Sage (frequente), Mauve (moderado), Gold (raro)
6. **Your Highlights** (header Sage):
   - Bullets motivacionais (awareness, patterns reconhecidos, áreas para explorar)
7. **Scientific References** (header Sage):
   - Citações no padrão APA (Burns, Beck, etc.)
8. **Watermark**: "t" cream real a 4.5% opacity, centralizado, em TODAS as páginas
9. **Footer**: icon pequeno + "terapily. · 2026" + paginação "N / T" + disclaimer

### 2. Therapist Result PDF (Clinician Copy)

Documento analítico com métricas derivadas, flags e dados brutos.

**Diferenças em relação ao Patient:**

1. **Clinician band** vermelha: "CLINICIAN COPY — NOT INTENDED FOR PATIENT DISTRIBUTION"
2. **Info box expandido**: inclui Therapist, Practice, License, NPI
3. **Derived Metrics** (header Sage):
   - Accuracy (vs referência Burns/Beck): percentual
   - Concentration Index: dominância de padrão (0-1)
   - Blind Spot Index: categorias não reconhecidas
4. **Clinical Flags** (box rosa #FCE4E4):
   - Flag ACTIVE com descrição e recomendação
   - Somente quando threshold é atingido
5. **Footer disclaimer**: "Platform-generated activity summary. Contains PHI. Store securely per your practice's policies."

## Sub-modos suportados

| Sub-modo | Visualização Patient | Dados Therapist |
|----------|---------------------|-----------------|
| `card_sort` | Zonas com cards em bullets | Tabela Card → Assigned → Reference → Match |
| `ranking_ladder` | Escada numerada | Lista ordenada + SUDS + clusters |
| `cycle_builder` | Slots com cards | Slot mapping + coerência narrativa |

## Métricas derivadas (card_sort)

- **Accuracy**: `correct_matches / total_cards × 100` (quando `reference_key` existe na config)
- **Concentration Index**: `max_zone_count / total_cards` (0-1, >0.7 = alta concentração)
- **Blind Spots**: `empty_zones / total_zones × 100`
- **Duration**: minutos + segundos
- **Hesitation Outliers**: cards com tempo >2× média (identificados mas não expostos ao paciente)

## Dados de entrada

- `activity_responses.raw_responses_encrypted` → decrypted → `{ mode, placements, duration_seconds }`
- `activity_catalog.config` → `cards`, `zones`, `slots`, `reference_key`, `clinical_reference`

## Audit trail

| Evento | Quando |
|--------|--------|
| `drag_drop_result.patient_generated` | Botão "Relatório Paciente" ou auto-geração via magic link |
| `drag_drop_result.therapist_generated` | Botão "Relatório Terapeuta" |

## Regras de marca (ver `mem://design/pdf-brand-rules`)

- Icon e watermark SEMPRE via `ICON_PNG_B64` / `WATERMARK_PNG_B64` de `pdf-brand-assets.server.ts`
- NUNCA inventar iconograma com fontes
- NUNCA gerar base64 programaticamente
- QA visual obrigatório (pdftoppm + inspeção) antes de qualquer entrega

## Referências científicas incluídas

- Burns, D.D. (1980). *Feeling Good: The New Mood Therapy*. William Morrow.
- Beck, A.T. (1976). *Cognitive Therapy and the Emotional Disorders*. Intl Universities Press.
- Harris, R. (2009). *ACT Made Simple*. New Harbinger.
- Linehan, M.M. (2015). *DBT Skills Training Manual*. Guilford Press.
- Padesky, C.A. (1994). Schema change processes in cognitive therapy. *Clinical Psychology & Psychotherapy*, 1(5), 267-278.
