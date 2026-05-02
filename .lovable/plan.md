
# Habit Progress Report — Redesign com 2 variantes

## Problema atual

O relatório atual é um PDF único, genérico, com visual básico (barras Sage monocromáticas, heatmap pequeno, footer simplificado). Não segue o template travado dos outros PDFs (Navy header 18mm com icon+wordmark, watermark 4.5%, footer completo com paginação dinâmica, clinician copy band, etc.). Não diferencia paciente de terapeuta.

---

## Proposta: 2 variantes

### Variante PACIENTE — "Mindfulness Practice Summary"

**Objetivo**: Motivar, reforçar consistência, celebrar progresso.

| Seção | Conteúdo |
|-------|----------|
| Header | Navy bar 18mm + icon + wordmark `terapily.` (padrão travado) |
| Título | "Mindfulness Practice Summary" + subtítulo "Your practice journey at a glance" |
| Info box | Participant (display_name), Activity, Period (first–last entry), Total sessions, Generated |
| Streak hero | Box grande com streak atual em destaque (número grande Navy) + "longest streak" ao lado, + % aderência com mini barra circular |
| Stats cards | 5 cards coloridos (backgrounds Sage, Mauve, Cream, soft-blue, soft-amber): Total sessions, Active days, Total time, Avg duration, Avg sessions/day |
| Heatmap (8 semanas) | Grid maior (5mm cells), 5 intensidades de cor (Cream vazio → Sage escuro cheio), labels de dia da semana à esquerda, meses no topo |
| Gráfico de frequência (30d) | Barras com gradiente Sage→Navy, grid de referência pontilhada, labels de data legíveis, valor sobre a barra nos dias com atividade |
| Timeline (últimas 10) | Dots Sage com linha vertical, data + hora + duração + ciclos, layout limpo |
| "About This Report" notice | Box amarelo padrão: "This report shows your practice frequency..." (sem diagnóstico, sem recomendação) |
| Footer | Padrão travado (icon + wordmark + ano, paginação central, disclaimer direita) |
| Watermark | Padrão travado (4.5% opacity, toda página) |

### Variante TERAPEUTA — "Mindfulness Adherence Report"

Tudo do paciente MAIS:

| Seção extra | Conteúdo |
|-------------|----------|
| Clinician copy band | Red band 10mm: "CLINICIAN COPY — NOT INTENDED FOR PATIENT DISTRIBUTION" |
| Info box expandido | + Therapist name, Practice name, License, NPI |
| Análise de padrões | Tabela de frequência por dia da semana (seg–dom), horário preferido (manhã/tarde/noite), sessão mais longa / mais curta |
| Gráfico semanal comparativo | Barras agrupadas por semana (últimas 8 semanas) mostrando evolução da frequência semana a semana |
| Gaps de inatividade | Lista de períodos sem prática > 3 dias, com duração do gap — dado clínico relevante para o terapeuta |
| Tabela completa de entries | Todas as entradas (paginada), não só as últimas 10: data, hora, duração, ciclos |
| Notices | "Platform-generated adherence summary. Does not replace clinical documentation in your EHR." |
| Footer | Disclaimer terapeuta padrão |

---

## Diferenças-chave entre os relatórios

| Dado | Paciente | Terapeuta |
|------|----------|-----------|
| Streak + aderência | Sim (motivacional) | Sim (analítico) |
| Padrões por dia da semana/horário | Não | Sim |
| Gaps de inatividade | Não | Sim |
| Todas as entries | Últimas 10 | Todas (paginado) |
| Clinician copy band | Não | Sim |
| Info clínico (license, NPI) | Não | Sim |
| Evolução semanal comparativa | Não | Sim |

---

## Paleta de cores nos gráficos

Em vez de tudo Sage monocromático:
- **Stats cards**: cada card com cor de fundo diferente (variações suaves de Sage, Mauve, Cream, soft-teal, soft-amber)
- **Heatmap**: 5 níveis — `#F4EFE6` (vazio) → `#C8DCC9` → `#7E9B86` → `#5A7C63` → `#3A5C43`
- **Barras do gráfico**: gradiente Sage→Navy nos dias mais ativos
- **Streak**: número em Navy grande, aro circular Sage
- **Gaps (terapeuta)**: highlight em Mauve suave para chamar atenção

---

## Implementação técnica

1. **Refatorar** `habit-report.server.ts` → criar `buildHabitReportPDF(params, variant: 'patient' | 'therapist')`
2. **Criar** `habit-report.functions.ts` → 2 server functions: `generateHabitReportPatient` e `generateHabitReportTherapist`
3. **Seguir 100%** as regras do template travado: header 18mm com icon real, watermark 4.5%, footer completo com paginação dinâmica 2-pass, checkPage antes de todo bloco fixo, font reset após page break
4. **Integrar** na aba de Habit Tracking do perfil do paciente: 2 botões (Relatório Paciente / Relatório Terapeuta) nos padrões de cor existentes (teal / rosa queimado)
5. **Audit log**: `habit_report.patient_generated` / `habit_report.therapist_generated`
6. **Salvar template** em memory como design travado

---

## O que NÃO muda

- Fluxo de magic link existente (escalas/worksheets)
- PatientPickerSheet e geração de habit links
- Tabelas no banco (habit_links, habit_entries)
- Nenhum outro PDF existente é alterado

Leda, aprova essa estrutura? Quer ajustar alguma seção, adicionar/remover dados, ou mudar a hierarquia visual?
