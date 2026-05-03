
# Drag & Drop Result PDF — Templates Paciente e Terapeuta

## Visão geral

Criar `drag-drop-result-pdf.server.ts` e `drag-drop-result-pdf.functions.ts` seguindo exatamente o padrão dos PDFs existentes (scale-result-pdf e worksheet-result-pdf). Gerar amostras visuais em PDF com dados fictícios do CBT-03 (Cognitive Distortions) para aprovação antes de travar o template.

## Passo 1 — Gerar PDFs de amostra (dados fictícios)

Criar um script Python com jsPDF-equivalent (reportlab) que gera 2 PDFs de exemplo usando dados simulados do CBT-03:
- `/mnt/documents/drag-drop-result-patient-sample.pdf`
- `/mnt/documents/drag-drop-result-therapist-sample.pdf`

Os PDFs seguem 100% o brand: header Navy, watermark, footer com paginação anti-adulteração, cores Terapily.

### Relatório Paciente (sample)
1. Header Navy com ícone + wordmark "terapily."
2. Título: "Activity Results" (Times bold 20pt Navy)
3. Info box (Participant, Activity, Date, Mode, Generated)
4. **Seção "Your Results"**: diagrama visual das zonas com cards posicionados — cada zona tem header Sage com nome, cards listados dentro como boxes Cream
5. **Seção "Highlights"**: 3-4 bullets motivacionais ("You identified X of Y patterns", "Most recognized pattern: [zona]", "Time: X minutes")
6. **Seção "Next Steps"**: texto genérico não-clínico
7. Notice box "About Your Data" (amarelo, mesmo template worksheet)
8. Footer com disclaimer paciente

### Relatório Terapeuta (sample)
1. Header Navy + clinician copy band vermelha
2. Título: "Clinical Activity Record"
3. PHI warning (quando aplicável)
4. Info box expandido (+Therapist, Practice, License, NPI)
5. **Seção "Structured Results"**: tabela completa (Card | Assigned Zone | Reference Zone | Match ✓/✗)
6. **Seção "Derived Metrics"**: Concentration Index, Blind Spots Index, Accuracy %, Hesitation outliers
7. **Seção "Clinical Observations"** (auto-geradas dos dados): "Concentration of X% in [zone]. Pattern consistent with [reference]." + citação bibliográfica
8. **Seção "Clinical Flags"** (se aplicável): boxes laranja com flag
9. **Seção "Longitudinal Comparison"** (se houver aplicações anteriores): tabela data|resumo|delta
10. **Seção "Raw Data"**: JSON resumido com timestamps
11. Notice "Notices" (mesmo template worksheet)
12. Footer com disclaimer terapeuta + referência bibliográfica

## Passo 2 — Implementar no código (após aprovação visual)

### Novos arquivos
- `src/features/activities/drag-drop-result-pdf.server.ts` — `buildDragDropResultPDF()` com as 2 variantes
- `src/features/activities/drag-drop-result-pdf.functions.ts` — `generateDragDropResultPatient` / `generateDragDropResultTherapist`

### Lógica por sub-modo

**card_sort** (CBT-03, CBT-06, ACT-01, ACT-02, DBT-06):
- Diagrama de zonas + cards
- Tabela card→zona (com gabarito quando disponível)
- Métricas: Concentration Index, Blind Spots, Accuracy

**ranking_ladder** (CBT-04):
- Escada visual com SUDS
- Tabela ordenada com valores SUDS
- Métricas: SUDS médio, clusters, coerência rank-SUDS

**cycle_builder** (CBT-05):
- Diagrama do ciclo com slots preenchidos
- Tabela slot→card
- Métrica: completude (slots preenchidos / total)

### Edições em arquivos existentes
- `src/routes/p.$token.tsx` — adicionar roteamento para `drag_drop` archetype na geração auto-PDF
- `src/routes/_authenticated/patients.$id.tsx` — importar e chamar as novas functions nos botões de relatório

## Passo 3 — Registrar template travado

Criar `mem://features/drag-drop-result-pdf` com todas as especificações visuais (cores, espaçamentos, renderers por sub-modo, notices, paginação). Source of truth para todo drag_drop futuro.

## Detalhes técnicos

- Reutiliza `pdf-brand-assets.server.ts` (ICON_PNG_B64, WATERMARK_PNG_B64)
- Reutiliza helpers compartilhados (drawHeader, drawFooter, drawWatermark, checkPage) — mesma assinatura dos outros PDFs
- Dados vêm de `activity_responses.response_data` (tipo `DragDropResponseData`)
- Gabarito vem de `activity_catalog.config.reference_key` (quando existe)
- PHI decrypted via `decryptPHIServer`
- Audit log: `drag_drop_result.patient_generated` / `drag_drop_result.therapist_generated`
