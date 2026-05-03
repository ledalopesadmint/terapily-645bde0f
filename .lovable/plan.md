
# Analytics: Links Efêmeros + PWA Install Tracking + Regra Obrigatória

## O que será feito

### 1. Métricas de links efêmeros no aggregator

Novas métricas na agregação diária (`aggregate-analytics.server.ts`) baseadas em audit_logs das ações `ephemeral.*`:

| Métrica | Fonte (audit action) | O que mede |
|---|---|---|
| `ephemeral.assigned` | `ephemeral.assigned` | Quantos links efêmeros foram prescritos |
| `ephemeral.consent_acknowledged` | `ephemeral.consent_acknowledged` | Terapeutas que aceitaram política 24h |
| `ephemeral.link_opened` | `ephemeral.link_opened` | Links abertos pelo paciente |
| `ephemeral.submitted` | `ephemeral.submitted` | Respostas submetidas |
| `ephemeral.pdf_downloaded` | `ephemeral.pdf_downloaded` | PDFs baixados antes da expiração |
| `ephemeral.expired` | `ephemeral.purged` | Dados purgados (expirados) |
| `ephemeral.expired_without_download` | Derivado: purged sem pdf_downloaded | Terapeutas que perderam o prazo |
| `ephemeral.completion_rate` | Derivado: submitted/link_opened | Taxa de conclusão efêmera |
| `ephemeral.download_rate` | Derivado: downloaded/submitted | % que baixou antes de expirar |
| `ephemeral.avg_download_delay_hours` | Derivado: tempo entre submit e download | Quanto tempo o terapeuta demora pra baixar |

### 2. PWA Install Tracking (quantidade apenas)

O app não tem PWA/service worker hoje. Vamos adicionar tracking do evento `beforeinstallprompt` e `appinstalled` do browser:

- Listener no `__root.tsx` para `beforeinstallprompt` (prompt disponível = dispositivo elegível)
- Listener para `appinstalled` (instalação confirmada)
- Ao detectar instalação, dispara audit log `platform.pwa_installed` via server function (fire-and-forget, sem PHI — só device_type: mobile/desktop/tablet via user-agent parsing)
- Métrica agregada: `platform.pwa_installs` por dia + dimensão device_type
- Métrica: `platform.pwa_eligible` (quantos viram o prompt)

Zero dados pessoais — só contagem por tipo de dispositivo.

### 3. Dashboard admin — nova seção

Na aba de Engajamento do dashboard admin:
- Card "Links Efêmeros" com: assigned, completion_rate, download_rate, expired_without_download
- Card "Instalações PWA" com: total installs, split por device
- Gráfico de linha: efêmeros prescritos vs completados vs expirados (últimos 30d)

### 4. Regra obrigatória no código (memory + comentário)

Salvar em `mem://preferences/analytics-mandatory-checklist`:

> **Regra**: Toda nova feature, link, ou fluxo DEVE incluir analytics antes de merge. Checklist:
> 1. Listar eventos relevantes (criação, uso, erro, expiração)
> 2. Definir métricas derivadas (rates, médias, contagens)
> 3. Adicionar cases no aggregator (`aggregate-analytics.server.ts`)
> 4. Adicionar cards/gráficos no dashboard admin
> 5. Atualizar `mem://features/platform-analytics` com as novas métricas
> 6. Zero PHI — só contagens e percentuais

Comentário no topo do aggregator referenciando esta regra.

## Arquivos modificados/criados

- `src/features/analytics/aggregate-analytics.server.ts` — novos cases ephemeral.* + pwa
- `src/features/analytics/pwa-install-tracker.ts` — listeners beforeinstallprompt/appinstalled + server function call
- `src/routes/__root.tsx` — importar e inicializar PWA tracker
- `src/features/analytics/analytics.functions.ts` — nova server function `trackPwaInstall`
- `src/routes/_authenticated/admin.analytics.tsx` — cards e gráficos efêmeros + PWA
- `mem://preferences/analytics-mandatory-checklist` — regra obrigatória
- `mem://features/platform-analytics` — atualizar com novas métricas
