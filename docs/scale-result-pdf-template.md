# Scale Result PDF — Template Travado (v10)

> **Regra:** Este template é o padrão mínimo de qualidade para os PDFs de
> resultado de escala. Nenhum downgrade é aceitável em layout, design,
> detalhes, dados, clareza, transparência, confiança, segurança, auditoria
> ou confirmação de dados.

---

## Fluxos de geração

| # | Fluxo | Variante | Trigger |
|---|-------|----------|---------|
| 1 | Magic link | `patient` | Auto após submit |
| 2 | Botão "Relatório Paciente" | `patient` | Terapeuta clica no perfil |
| 3 | Botão "Relatório Terapeuta" | `therapist` | Terapeuta clica no perfil |

Geração **on-demand** (sem storage). Audit log em toda geração.

---

## Arquivos

- `src/features/activities/scale-result-pdf.server.ts` — `buildScaleResultPDF()`
- `src/features/activities/scale-result-pdf.functions.ts` — server fns autenticadas
- Integração no `submitActivityResponse` para auto-geração no magic link

---

## Palavras proibidas

improving, worsening, better, worse, progress, trend analysis, regression,
prediction, RCI, CSI, clinically significant, HIPAA-certified,
court-defensible, legally binding, guaranteed, diagnosis, treatment plan

---

## Variante PATIENT (1 página típica)

1. Navy header bar (18mm) com icon + wordmark `terapily.`
2. Title "Activity Result" + subtitle "Summary of your responses"
3. Info box (bg Cream): Participant, Activity, Date, Mode, Generated
4. Score result box (bg sage-tint, border Sage): "Your Score: X / MAX" + Band
5. Item table (Navy header, zebra rows): #, Item, Response, Points + total row Sage
6. Important Notice box (bg yellow, border gold): padding simétrico
   `padX=6, padTop=7, padBottom=7`, altura dinâmica, disclaimers
7. Footer com icon + wordmark + ano + paginação + disclaimer

## Variante THERAPIST (2 páginas típicas)

Tudo do patient MAIS:

1. Red "CLINICIAN COPY" banner
2. PHI Warning box (se nome real presente)
3. Info expandido: Therapist, Practice, License, NPI
4. Score box expandido: Items answered, Completion %
5. Cluster Subscores (se aplicável)
6. Coluna Flag na table (⚠ vermelho)
7. **Scoring Transparency**: método, instrumento, fórmula em Courier
   (`2 + 2 + 1 + ... = 10`), breakdown item-a-item
   (`Item 1: "label" → response X = Y pts`), max score, severity bands
   com highlight visual na banda correspondente
8. Clinical Flags: box laranja por flag com ⚠ + item + response value
9. Notices: texto corrido, responsabilidade clínica do profissional

---

## Regras de layout e paginação

- `checkPage(y, needed)` antes de todo bloco fixo
- Table header re-draw após page break
- Paginação dinâmica (`p / totalPages`) em loop final
- Footer + watermark em TODA página

---

## Constantes de marca

| Token | RGB |
|-------|-----|
| NAVY | 31, 42, 54 |
| CREAM | 244, 239, 230 |
| SAGE | 126, 155, 134 |
| CHARCOAL | 58, 63, 71 |
| WHITE | 255, 255, 255 |
| RED | 192, 57, 43 |

Margens: 18mm. CW: 174mm. Footer zone: 275mm.

---

## Padrão de qualidade mínimo (INEGOCIÁVEL)

1. **Layout**: padding simétrico, conteúdo centralizado, sem overflow/clipagem
2. **Design**: paleta brand, tipografia hierárquica (Times/Helvetica/Courier)
3. **Detalhes**: paginação, header/footer/watermark em toda página, table header re-draw
4. **Dados**: tudo derivado das respostas, cálculo visível e auditável
5. **Clareza**: linguagem neutra, zero interpretação, zero insinuação
6. **Transparência**: item-by-item, fórmula, severity bands com highlight
7. **Confiança**: disclaimers, "Band (per instrument definition)", PHI warning
8. **Segurança**: PHI cifrado/decifrado on-demand, CLINICIAN COPY banner
9. **Auditoria**: audit log sem PHI em toda geração
10. **Confirmação**: score, max, completion, answered/expected — tudo explícito
