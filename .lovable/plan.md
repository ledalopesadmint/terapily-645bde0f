
# Platform Analytics — Engajamento + Erros + Insights Estratégicos

## 1. Migração: tabela `platform_analytics`

```sql
CREATE TABLE public.platform_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  hour_bucket smallint,
  day_of_week smallint,
  metric text NOT NULL,
  dimension text DEFAULT 'total',
  value integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(date, hour_bucket, metric, dimension)
);

ALTER TABLE public.platform_analytics ENABLE ROW LEVEL SECURITY;

-- Somente admin lê
CREATE POLICY "platform_analytics: admin read"
  ON public.platform_analytics FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Ninguém insere via client
CREATE POLICY "platform_analytics: deny client insert"
  ON public.platform_analytics FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY "platform_analytics: deny update"
  ON public.platform_analytics FOR UPDATE TO authenticated
  USING (false);

CREATE POLICY "platform_analytics: deny delete"
  ON public.platform_analytics FOR DELETE TO authenticated
  USING (false);
```

Zero UUIDs, zero PHI, contagens puras.

## 2. Métricas por Categoria Estratégica

Apenas métricas com valor real para valuation, vendas e produto. Organizadas em 4 categorias no dashboard:

### Categoria A — Validação Comercial (força de venda)
Métricas que comprovam claims da landing e pitch.

| Métrica | Fonte | Claim que valida |
|---------|-------|------------------|
| `patient.completion_rate` | audit_logs (opened vs submitted) | "Activities your clients actually finish" |
| `patient.habit_return_rate` | habit_entries (pacientes com 3+ entries) | "Patients build real habits" |
| `therapist.weekly_active` | audit_logs auth.signin (workspaces distintos/semana) | "Therapists use it daily" |
| `therapist.activities_per_week` | audit_logs activity.assigned | "X activities per therapist per week" |

### Categoria B — Engajamento de Produto (valuation / growth)
Métricas que investidor/advisor quer ver.

| Métrica | Fonte |
|---------|-------|
| `therapist.dau` | workspaces distintos com login/dia |
| `therapist.wau` | workspaces distintos com login/semana |
| `therapist.mau` | workspaces distintos com login/mês |
| `patient.activities_completed` | count diário |
| `patient.habit_entries` | count diário |
| `therapist.links_shared` | activity.share_intent/dia |

### Categoria C — Inteligência de Produto (decisões)
Métricas que guiam roadmap e priorização.

| Métrica | Fonte |
|---------|-------|
| `therapist.delivery_mode.in_session` | activity.assigned metadata |
| `therapist.delivery_mode.shared_link` | activity.assigned metadata |
| `patient.peak_hour` | hora com mais completions |
| `therapist.peak_hour` | hora com mais logins |
| `patient.avg_completion_minutes` | diff link_opened → submitted |

### Categoria D — Saúde do App (erros e UX)
Métricas de erro agregadas para priorizar fixes.

| Métrica | Fonte |
|---------|-------|
| `error.server.{operation}` | console.error em server functions (contagem por operação) |
| `error.magic_link` | falhas de resolve/submit (token inválido, expirado, rate limited) |
| `error.client.{route}` | error boundary reporter (rota + error name, sem stack) |

## 3. Arquivos a criar/editar

### Novos
- **`src/features/analytics/aggregate-analytics.server.ts`** — Lógica de agregação: lê audit_logs do dia anterior, agrupa por hora/métrica, faz upsert em platform_analytics. Inclui cálculo de completion_rate e habit_return_rate.
- **`src/features/analytics/analytics.functions.ts`** — Server functions admin-only: `getAnalyticsDashboard` (dados para gráficos), `getWeeklyInsights` (resumo textual semanal), `exportAnalyticsCSV`, `triggerAggregation` (botão manual).
- **`src/features/analytics/weekly-insights.server.ts`** — Gerador de insights semanais automáticos: compara semana atual vs anterior, identifica tendências (ex: "completion rate subiu 12%", "logins caíram 8%"), retorna lista de bullet points factuais.
- **`src/features/analytics/error-tracker.server.ts`** — Interceptor leve: função `trackServerError(operation, errorCode)` que faz INSERT direto na platform_analytics (contagem por hora/operação). Chamada nos catch blocks existentes das server functions.
- **`src/routes/api/public/hooks/aggregate-analytics.ts`** — Cron endpoint com verificação de secret (`ANALYTICS_HOOK_SECRET`). Chama aggregatePlatformAnalytics para o dia anterior.
- **`src/routes/_authenticated/admin.analytics.tsx`** — Dashboard admin com 4 abas (Comercial, Engajamento, Produto, Erros). Gráficos com recharts. Botão "Agregar agora" + "Exportar CSV". Seção "Insights da Semana" no topo.

### Editados
- **`src/server/admin.functions.ts`** — Adicionar import do analytics para navegação.
- **`src/routes/_authenticated/admin.index.tsx`** — Adicionar link/card para "Analytics" no painel admin.
- **Server functions com console.error**  — Adicionar chamada a `trackServerError` nos catch blocks de: `activities.functions.ts`, `habits.functions.ts`, `public-activities.functions.ts`. Leve: 1 linha por catch.

## 4. Dashboard Admin — Layout

```text
┌──────────────────────────────────────────────┐
│  ANALYTICS DE PLATAFORMA          [Agregar] [CSV] │
├──────────────────────────────────────────────┤
│  📊 INSIGHTS DA SEMANA                        │
│  • Completion rate: 78% (+12% vs semana ant.) │
│  • DAU: 3 workspaces ativos/dia              │
│  • Pico pacientes: 8h-9h (32% das completions)│
│  • 2 erros em /p/$token (rate limit)         │
├──────────────────────────────────────────────┤
│  [Comercial] [Engajamento] [Produto] [Erros]  │
│                                               │
│  (gráficos da aba selecionada)               │
└──────────────────────────────────────────────┘
```

- Recharts (já instalado? senão bun add). Gráficos leves, brand colors.
- Período selecionável: 7d, 30d, 90d.
- Exportar CSV: download direto com todas as métricas do período.

## 5. Insights Semanais Automáticos

A função `getWeeklyInsights` compara a semana corrente (até hoje) com a anterior e gera bullets factuais:

- Variações >10% são destacadas (positivas em Sage, negativas em Mauve)
- Formato: "{métrica}: {valor} ({variação}% vs semana anterior)"
- Sem interpretação clínica, sem linguagem inflada
- Exemplos: "Completion rate: 78% (+12%)", "Habit entries: 34 (-5%)", "Server errors: 2 (new: submitActivity)"

## 6. Error Tracking (leve e desidentificado)

Não é um Sentry. É contagem agregada por operação + hora.

- `trackServerError("submitActivity", "PGRST301")` → incrementa `error.server.submitActivity` na platform_analytics
- `trackServerError("resolveToken", "EXPIRED")` → incrementa `error.magic_link`  
- Client error boundary: POST para server function com `{ route, errorName }` → incrementa `error.client./patients`
- Zero stack trace, zero PHI, zero user_id

## 7. Privacy Policy

Parágrafo a adicionar (EN-US, landing/terms):

> "We collect anonymized, aggregate usage data — such as day of week, time of day, and feature usage counts — to improve our platform and measure engagement. No individual or identifiable data is collected, stored, or shared. These metrics cannot be linked back to any specific person, workspace, or clinical record."

## 8. Cron (configuração posterior)

pg_cron chamando `/api/public/hooks/aggregate-analytics` diariamente às 3h UTC. Inicialmente Leda pode rodar manualmente via botão "Agregar agora" no dashboard.

## 9. Secret necessário

`ANALYTICS_HOOK_SECRET` — para o cron endpoint. Será solicitado via add_secret.

## O que NÃO será feito
- Nenhum dado per-workspace ou per-user
- Nenhum cruzamento com PHI
- Nenhum PostHog, GA, Sentry, ou tracking externo
- Nenhum tracking em rotas públicas do paciente (/p/$token, /h/$token)
- Nenhum stack trace ou payload de erro
