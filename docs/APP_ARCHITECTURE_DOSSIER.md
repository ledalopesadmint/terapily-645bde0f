# Terapily — Dossiê Técnico de Arquitetura

> **Documento gerado em:** 2026-05-08
> **Finalidade:** Auditoria externa de arquitetura de software
> **Versão do código:** HEAD (snapshot do repositório na data acima)
> **Importante:** Este documento é descritivo. Nenhum arquivo funcional foi alterado.

---

## Sumário

1. [Visão Geral do App](#1-visão-geral-do-app)
2. [Estrutura de Pastas](#2-estrutura-de-pastas)
3. [Mapa de Rotas](#3-mapa-de-rotas)
4. [Mapa de Features](#4-mapa-de-features)
5. [Banco de Dados / Supabase](#5-banco-de-dados--supabase)
6. [Billing / Stripe](#6-billing--stripe)
7. [Autenticação e Permissões](#7-autenticação-e-permissões)
8. [Relatórios e PDFs](#8-relatórios-e-pdfs)
9. [Acervo / Biblioteca Clínica](#9-acervo--biblioteca-clínica)
10. [Atividades Clínicas](#10-atividades-clínicas)
11. [Duplicações e Legado](#11-duplicações-e-legado)
12. [Pontos de Acoplamento](#12-pontos-de-acoplamento)
13. [Recomendação de Modularização](#13-recomendação-de-modularização)
14. [Checklist Final](#14-checklist-final)

---

## 1. Visão Geral do App

### Objetivo do produto

Terapily é uma plataforma de **therapeutic tools** para terapeutas. Oferece atividades clínicas dinâmicas (escalas validadas, worksheets, mindfulness, drag-and-drop interativo), entregues via **magic link** (sem conta do paciente), com dados criptografados, audit trail completo e relatórios exportáveis. Convive com EHRs existentes (SimplePractice, TherapyNotes) — não os substitui.

### Principais fluxos

1. **Signup/Login** → Terapeuta cria conta (email/senha ou Google OAuth) → workspace pessoal + trial 14 dias.
2. **Cadastro de paciente** → Dados mínimos (apelido + iniciais + opcionalmente nome/email/telefone criptografados AES-256-GCM).
3. **Prescrição de atividade** → Terapeuta escolhe atividade no acervo → atribui a paciente → modo `in_session` (ao vivo) ou `shared_link` (magic link).
4. **Execução pelo paciente** → Paciente abre link `/p/$token` (single-use) ou `/h/$token` (habit, reutilizável), dá consentimento, completa a atividade. Dados cifrados são gravados.
5. **Relatórios** → PDFs gerados on-demand em RAM (zero-storage): variante paciente (motivacional, sem PHI identificável) e variante terapeuta (clínica, com flags e dados decifrados).
6. **Compliance Report** → Relatório exportável por paciente com histórico de atividades, scores, flags, audit trail.
7. **Billing** → Stripe BYOK: planos Basic ($69/20 pacientes) e Practice ($159/50 pacientes). Trial 14d.
8. **Admin** → Exclusivo de `admin@terapily.com` (Leda). Painel de compliance, analytics, auditoria.

### Perfis de usuário

| Perfil | Conta? | Acesso |
|--------|--------|--------|
| **Terapeuta** (owner) | Sim | Workspace completo, todos os pacientes, billing, settings |
| **Terapeuta** (membro) | Sim | Só pacientes atribuídos a ele (Practice/Clinic) |
| **Supervisor** | Sim | Reservado para Clinic (futuro) |
| **Paciente** | **Nunca** | Só via magic link single-use. Nunca cria conta. |
| **Admin** | Sim | Único — `admin@terapily.com`. SELECT em todas as tabelas. |

### Organização atual

- **Stack:** React 19 + TanStack Start v1 (file-based routing, SSR) + Vite 7 + Tailwind v4 + shadcn/ui
- **Backend:** Supabase (Lovable Cloud) — Postgres + RLS + Auth
- **Runtime:** Cloudflare Worker (Edge, `nodejs_compat`)
- **Pagamentos:** Stripe BYOK (conta da Leda)
- **Lógica server:** `createServerFn` (TanStack Start) — não usa Supabase Edge Functions
- **Email:** Desligado (feature flag `RESEND_BAA_SIGNED` = false). Terapeuta copia link manualmente.

---

## 2. Estrutura de Pastas

```
/
├── clinical-references/         Referências científicas por categoria (PDFs, markdowns). PRÉ-REQUISITO BLOQUEANTE para toda atividade nova.
├── docs/                        Documentação versionada (architecture, security, magic-link-rules, etc.)
├── public/                      Arquivos estáticos (robots.txt, manifest)
├── supabase/
│   ├── config.toml              Config do projeto Supabase (auto-gerado, não editar settings do projeto)
│   └── migrations/              48 migrations SQL versionadas
├── src/
│   ├── assets/                  Imagens e assets estáticos (vinheta áudio, etc.)
│   ├── components/
│   │   ├── brand/               AuthShell, Logo, SidebarLogo, GoogleButton, CapsLockHint, Eyebrow
│   │   ├── feedback/            EmptyState
│   │   ├── layout/              AppShell (sidebar + layout principal)
│   │   └── ui/                  ~50 componentes shadcn/ui (button, card, dialog, sheet, table, etc.)
│   ├── features/                Módulos de domínio (core do negócio)
│   │   ├── activities/          Magic link, scoring, PDFs, consent, audit, drafts
│   │   ├── analytics/           Métricas desidentificadas, error tracking, dashboard admin
│   │   ├── audit/               Helpers compartilhados (audit.server.ts)
│   │   ├── auth/                AuthProvider, profile functions, redirect hooks
│   │   ├── billing/             Stripe BYOK, plan.server.ts, trial banner
│   │   ├── dev/                 Activity roadmap (dev-only)
│   │   ├── ephemeral/           Links efêmeros (/e/$token) — dados 24h
│   │   ├── feature-flags/       useFeatureFlag hook
│   │   ├── games/               Placeholder (shell vazio, não implementado)
│   │   ├── habits/              Habit tracker links (/h/$token), relatórios habit
│   │   ├── library/             Acervo: CategoryBrowser, ActivityCard, ScaleCard, runners, seed-data, archetypes
│   │   ├── patients/            CRUD de pacientes, soft delete, restore, limite, reveal contact
│   │   └── workspace/           Multi-tenant workspace functions
│   ├── hooks/                   use-mobile.tsx
│   ├── integrations/
│   │   ├── lovable/             Lovable AI gateway integration
│   │   └── supabase/            client.ts (browser), client.server.ts (admin), auth-middleware.ts, types.ts (auto-gerado)
│   ├── lib/
│   │   ├── constants.ts         Constantes globais (HABIT_LINK_CATEGORIES, etc.)
│   │   ├── crypto/              encryption.server.ts — AES-256-GCM (server-only)
│   │   ├── logging/             activity-logger.server.ts
│   │   ├── rate-limit/          public-link.server.ts — rate limit em memória do worker
│   │   ├── retry/               with-retry.server.ts + teste
│   │   ├── scoring/             scoring.server.ts — engine genérica de auto-scoring
│   │   ├── tokens/              magic-link.server.ts — geração e hash SHA-256
│   │   ├── utils.ts             cn() e utilidades
│   │   └── validation/          schemas.ts — schemas Zod compartilhados
│   ├── routes/                  File-based routing (TanStack Start)
│   │   ├── __root.tsx           Root layout (html/head/body shell)
│   │   ├── _authenticated.tsx   Layout guard — redireciona para /login se não autenticado
│   │   ├── _authenticated/      Todas as rotas protegidas
│   │   ├── api/public/          Server routes (webhooks, cron hooks)
│   │   ├── index.tsx            Landing page pública (EN-US)
│   │   └── *.tsx                Rotas públicas (login, signup, forgot-password, reset-password, p.$token, h.$token, e.$token, auth.callback)
│   ├── server/                  Server functions do admin (compliance, flags clínicos)
│   ├── types/                   Augmentações de tipo (lovable-auth-augmentation.d.ts)
│   ├── routeTree.gen.ts         AUTO-GERADO — nunca editar
│   ├── router.tsx               Bootstrap do router TanStack
│   ├── start.ts                 Entry point TanStack Start
│   ├── styles.css               Design tokens Tailwind v4 (oklch), paleta Sage/Navy/Cream/Mauve
│   └── test-setup.ts            Setup de testes (vitest)
```

---

## 3. Mapa de Rotas

### Rotas públicas (sem autenticação)

| Path | Arquivo | Renderiza | Dados | Risco se alterado |
|------|---------|-----------|-------|-------------------|
| `/` | `src/routes/index.tsx` (1855 linhas) | Landing page EN-US com pilares, pricing, FAQ | Estático | Landing é a vitrine pública. Muito grande — risco de regressão visual. |
| `/login` | `src/routes/login.tsx` | Formulário email/senha + Google | Supabase Auth | Quebra acesso de todos os terapeutas |
| `/signup` | `src/routes/signup.tsx` | Cadastro de terapeuta | Supabase Auth | Impede novos registros |
| `/forgot-password` | `src/routes/forgot-password.tsx` | Reset por email | Supabase Auth | Terapeuta fica preso se esquecer senha |
| `/reset-password` | `src/routes/reset-password.tsx` | Formulário nova senha (via token no hash) | Supabase Auth | Idem |
| `/auth/callback` | `src/routes/auth.callback.tsx` | OAuth callback (Google) | Supabase Auth | Quebra login Google |
| `/p/$token` | `src/routes/p.$token.tsx` (657 linhas) | Player de atividade pública (magic link) | `patient_activities`, `activity_catalog`, `activity_responses` | **CRÍTICO** — é o ponto de contato do paciente. Quebra interrompe toda coleta de dados. |
| `/h/$token` | `src/routes/h.$token.tsx` (977 linhas) | Habit tracker público (link reutilizável) | `habit_links`, `habit_entries`, `activity_catalog` | Quebra tracker de mindfulness |
| `/e/$token` | `src/routes/e.$token.tsx` (196 linhas) | Link efêmero (dados 24h) | `ephemeral_activities`, `ephemeral_responses` | Quebra links efêmeros |

### Rotas autenticadas (`/_authenticated/`)

Todas exigem sessão Supabase válida. Redirecionam para `/login` se não autenticado.

| Path | Arquivo | Role/Permissão | Renderiza | Dados | Risco |
|------|---------|----------------|-----------|-------|-------|
| `/welcome` | `welcome.tsx` | Qualquer terapeuta | Onboarding pós-signup | Profile | Baixo |
| `/dashboard` | `dashboard.tsx` (248 linhas) | Qualquer terapeuta | Dashboard resumo | Patients, activities, subscription | Médio — hub central |
| `/patients` | `patients.tsx` (312 linhas) | Qualquer terapeuta | Lista de pacientes | `patients` (filtrado por workspace) | Alto — CRUD principal |
| `/patients/$id` | `patients.$id.tsx` (1882 linhas) | Terapeuta atribuído ou owner | Perfil do paciente + atividades + habit + relatórios | `patients`, `patient_activities`, `activity_responses`, `habit_links`, `habit_entries`, `activity_consents`, `ephemeral_activities` | **CRÍTICO** — maior arquivo de rota. Concentra muita lógica. |
| `/patients/deleted` | `patients.deleted.tsx` (169 linhas) | Terapeuta atribuído ou owner | Pacientes soft-deletados (restaurar) | `patients` (deleted_at IS NOT NULL) | Médio — janela de 30 dias |
| `/library` | `library.tsx` (677 linhas) | Qualquer terapeuta | Acervo de atividades (catálogo) | `activity_catalog` + seed-data fallback | Alto — entrada pra prescrever |
| `/scales` | `scales.tsx` (200 linhas) | Qualquer terapeuta | Escalas validadas (sub-aba do acervo) | `activity_catalog` filtrado por quiz_scale | Médio |
| `/mindfulness` | `mindfulness.tsx` (226 linhas) | Qualquer terapeuta | Atividades de mindfulness | `activity_catalog` filtrado | Médio |
| `/worksheets` | `worksheets.tsx` (195 linhas) | Qualquer terapeuta | Worksheets | `activity_catalog` filtrado | Médio |
| `/cbt` | `cbt.tsx` (118 linhas) | Qualquer terapeuta | CBT essentials (drag-drop, worksheets) | `activity_catalog` filtrado | Baixo |
| `/settings` | `settings.tsx` (68 linhas) | Qualquer terapeuta | Layout com Outlet para sub-rotas | — | Baixo |
| `/settings/profile` | `settings.profile.tsx` (230 linhas) | Qualquer terapeuta | Editar perfil | `profiles` | Baixo |
| `/settings/billing` | `settings.billing.tsx` (405 linhas) | Owner do workspace | Plano, checkout Stripe, portal | `subscriptions`, `stripe_products` | Alto — billing |
| `/settings/workspace` | `settings.workspace.tsx` (200 linhas) | Owner | Config do workspace | `workspaces`, `workspace_members` | Médio |
| `/settings/security` | `settings.security.tsx` (138 linhas) | Qualquer terapeuta | Senha, MFA (futuro) | Supabase Auth | Médio |
| `/admin` | `admin.tsx` (97 linhas) | **Admin only** (`has_role('admin')`) | Layout admin com Outlet | — | Alto — admin |
| `/admin` (index) | `admin.index.tsx` (421 linhas) | Admin | Dashboard admin (métricas globais) | `platform_analytics`, `workspaces`, `subscriptions` | Alto |
| `/admin/analytics` | `admin.analytics.tsx` (1064 linhas) | Admin | Analytics detalhado | `platform_analytics` | Médio |
| `/admin/audit` | `admin.audit.tsx` (227 linhas) | Admin | Audit logs globais | `audit_logs` | Alto — compliance |
| `/admin/billing` | `admin.billing.tsx` (73 linhas) | Admin | Billing admin | `subscriptions`, `stripe_events` | Médio |
| `/admin/compliance` | `admin.compliance.tsx` (640 linhas) | Admin | Compliance console hierárquico | Todas as tabelas (read-only) | **CRÍTICO** — visão total |
| `/admin/insights` | `admin.insights.tsx` (163 linhas) | Admin | Weekly insights | `platform_analytics` | Baixo |
| `/dev/roadmap` | `dev.roadmap.tsx` | Qualquer (dev-only) | Roadmap de atividades | Estático | Nenhum |

### Server routes (API)

| Path | Arquivo | Auth | Finalidade |
|------|---------|------|-----------|
| `/api/public/stripe-webhook` | `src/routes/api/public/stripe-webhook.ts` | HMAC (Stripe signature) | Webhook Stripe (checkout, invoice, subscription) |
| `/api/public/hooks/purge-patients` | `src/routes/api/public/hooks/purge-patients.ts` | Secret (`PURGE_HOOK_SECRET`) | Cron: purge de pacientes soft-deleted há 30+ dias |
| `/api/public/hooks/aggregate-analytics` | `src/routes/api/public/hooks/aggregate-analytics.ts` | Secret (`ANALYTICS_HOOK_SECRET`) | Cron: agregação diária de métricas |

---

## 4. Mapa de Features

### 4.1 Auth

- **Arquivos:** `src/features/auth/AuthProvider.tsx`, `auth-events.functions.ts`, `profile.functions.ts`, `useRedirectIfAuthenticated.ts`
- **Componentes:** `AuthShell.tsx`, `GoogleButton.tsx`, `CapsLockHint.tsx`
- **Tabelas:** `profiles`, `user_roles`
- **Dependências internas:** `supabase/client.ts`, `supabase/auth-middleware.ts`
- **Estado:** ✅ Funcional. Email/senha + Google OAuth. Sem MFA (planejado S5).

### 4.2 Onboarding

- **Arquivo:** `src/routes/_authenticated/welcome.tsx`
- **Componentes:** Inline no arquivo de rota
- **Tabelas:** `profiles`
- **Estado:** ✅ Funcional. Tela simples pós-signup.

### 4.3 Dashboard

- **Arquivo:** `src/routes/_authenticated/dashboard.tsx` (248 linhas)
- **Tabelas:** `patients`, `patient_activities`, `subscriptions`
- **Estado:** ✅ Funcional. Resumo de pacientes, atividades recentes, status do plano.

### 4.4 Patients

- **Arquivos:** `src/features/patients/patients.functions.ts`, `patients.types.ts`
- **Componentes:** `PatientForm.tsx`, `PatientList.tsx`, `DeletePatientDialog.tsx`, `RevealContactDialog.tsx`, `PatientLimitBanner.tsx`, `PatientLimitModal.tsx`
- **Tabelas:** `patients` (PHI cifrado: `full_name_encrypted`, `email_encrypted`, `phone_encrypted`)
- **Dependências:** `crypto/encryption.server.ts`, `billing/plan.server.ts` (limite de pacientes)
- **Estado:** ✅ Funcional. CRUD completo + soft delete + restore + reveal on-demand + limite por plano.

### 4.5 Billing

- **Arquivos:** `src/features/billing/billing.functions.ts`, `admin.functions.ts`, `plan.server.ts`, `stripe.server.ts`, `trial-status.ts`
- **Componentes:** `TrialExpiredBanner.tsx`
- **Tabelas:** `subscriptions`, `stripe_products`, `stripe_events`
- **Webhook:** `src/routes/api/public/stripe-webhook.ts`
- **Dependências:** Stripe SDK (`stripe` npm), `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_PRACTICE`
- **Estado:** ✅ Funcional (modo test). BYOK na conta da Leda.

### 4.6 Audit

- **Arquivos:** `src/features/audit/audit.server.ts`
- **Tabelas:** `audit_logs` (append-only, INSERT revogado do client)
- **Triggers:** 10+ triggers SECURITY DEFINER (`audit_patient_change`, `audit_patient_activity_change`, `audit_activity_response_insert`, `audit_subscription_change`, `audit_activity_draft_change`, `audit_habit_link_change`, `audit_habit_entry_insert`, `audit_ephemeral_activity_change`, `audit_ephemeral_response_insert`, `audit_activity_consent_insert`, `audit_scheduled_application_change`)
- **Estado:** ✅ Funcional. Cobertura ampla.

### 4.7 Reports/PDFs

- **Arquivos:**
  - `scale-result-pdf.server.ts` (717 linhas) + `.functions.ts`
  - `worksheet-result-pdf.server.ts` (642 linhas) + `.functions.ts`
  - `drag-drop-result-pdf.server.ts` (845 linhas) + `.functions.ts`
  - `compliance-report.server.ts` (1306 linhas) + `.functions.ts`
  - `habit-report.server.ts` (1176 linhas) + `.functions.ts`
  - `audit-export.functions.ts`
  - `pdf-brand-assets.server.ts` (source único de base64 para assets de marca)
- **Estado:** ✅ Funcional. 5 geradores de PDF, cada um com variante paciente + terapeuta. Geração em RAM (zero-storage).

### 4.8 Worksheets

- **Runner:** `src/features/library/runners/structured_form/FormRunner.tsx`, `form-types.ts`
- **Seed data:** 15 worksheets em `seed-data.ts` (CBT-01 a WS-15)
- **Tabelas:** `activity_catalog` (config JSONB), `patient_activities`, `activity_responses`
- **Relatório:** `worksheet-result-pdf.server.ts`
- **Estado:** ✅ Funcional. Arquétipo `structured_form`.

### 4.9 Scales (Escalas Validadas)

- **Runner:** `src/features/library/runners/structured_form/FormRunner.tsx` (mesmo runner dos worksheets, arquétipo `quiz_scale`)
- **Scoring:** `src/lib/scoring/scoring.server.ts` (208 linhas)
- **Seed data:** 33 escalas no banco (`activity_catalog`) + 3 no seed-data estático
- **Relatório:** `scale-result-pdf.server.ts`
- **Estado:** ✅ Funcional. Auto-scoring com severity bands e clinical flags.

### 4.10 Mindfulness

- **Runners:**
  - `BreathingRunner.tsx` + `breathing-sounds.ts` + `breathing-types.ts` (arquétipo `guided_timer` com `runner: "breathing"`)
  - `GuidedScriptRunner.tsx` + `script-types.ts` (arquétipo `guided_script`)
- **Seed data:** 20 atividades de mindfulness no `seed-data.ts` (MIN-01 a MIN-20, TRA-02)
- **Tabelas:** `activity_catalog`, `patient_activities`, `activity_responses`, `habit_links`, `habit_entries`
- **Relatório:** `habit-report.server.ts` (para habit tracker), `worksheet-result-pdf.server.ts` (para guided_script com reflexões)
- **Estado:** ✅ Funcional. 4 tipos de respiração, body scan, PMR, grounding, meditação, defusão, micro-práticas.

### 4.11 CBT / Drag-and-Drop

- **Runner:** `src/features/library/runners/drag_drop/DragDropRunner.tsx` + `CardSortLayout.tsx`, `RankingLadderLayout.tsx`, `CycleBuilderLayout.tsx`, `DraggableCard.tsx`
- **Sub-modos:** `card_sort`, `ranking_ladder`, `cycle_builder`
- **Seed data:** `CBT-03` (Distorções Cognitivas), mais no banco
- **Relatório:** `drag-drop-result-pdf.server.ts`
- **Estado:** ✅ Funcional.

### 4.12 Acervo / Library

- **Arquivos:** `src/features/library/` — `CategoryBrowser.tsx`, `CategoryRow.tsx`, `ActivityCard.tsx`, `ScaleCard.tsx`, `LibraryHero.tsx`, `InSessionQuickAccess.tsx`, `PatientPickerSheet.tsx`, `RecommendedEmpty.tsx`, `ResourceBox.tsx`, `illustrations.tsx`
- **Dados:** Dual-source — `seed-data.ts` (fallback estático) + `activity_catalog` (banco)
- **Tabelas:** `activity_catalog`
- **Estado:** ✅ Funcional. Seed data é marcado como temporário — será removido quando banco tiver todas as atividades.

### 4.13 Habit Tracker

- **Arquivos:** `src/features/habits/` — `HabitTrackingTab.tsx`, `habits.functions.ts`, `habits.server.ts`, `habit-report.functions.ts`, `habit-report.server.ts`
- **Tabelas:** `habit_links`, `habit_entries`
- **Rota pública:** `/h/$token`
- **Estado:** ✅ Funcional.

### 4.14 Ephemeral Links

- **Arquivos:** `src/features/ephemeral/` — `ephemeral.functions.ts`, `ephemeral-public.functions.ts`, `ephemeral.server.ts`, `EphemeralCountdownBadge.tsx`
- **Tabelas:** `ephemeral_activities`, `ephemeral_responses`
- **Cron:** `purge_expired_ephemeral_data()` (pg_cron a cada 15min)
- **Rota pública:** `/e/$token`
- **Estado:** ✅ Funcional.

### 4.15 Settings

- **Arquivos:** `settings.tsx` (layout) + 4 sub-rotas (profile, billing, workspace, security)
- **Estado:** ✅ Funcional.

### 4.16 Admin

- **Arquivos:** `admin.tsx` (layout guard: `has_role('admin')`) + 5 sub-rotas
- **Server:** `src/server/admin.functions.ts`, `admin-compliance.functions.ts`, `admin-compliance.server.ts`, `clinical-flag.server.ts`
- **Tabelas:** Todas (read-only via service role para compliance)
- **Permissão:** Exclusivo `admin@terapily.com`. Banco bloqueia 2º admin via unique index parcial.
- **Estado:** ✅ Funcional.

### 4.17 Favorites

- **Estado:** ❌ Não identificado no código atual. Não há tabela `favorites` nem componente de favoritos.

### 4.18 Games

- **Arquivos:** `src/features/games/_core/` — `GameShell.tsx`, `ShareableLink.tsx`, `game.types.ts`, `useGameSession.ts`, `README.md`
- **Estado:** 🔶 Placeholder/shell vazio. Não implementado. Sem atividades vinculadas.

### 4.19 Consent Layer

- **Arquivos:** `src/features/activities/components/ConsentGate.tsx`, `consent.functions.ts`
- **Tabelas:** `activity_consents`
- **Estado:** ✅ Funcional. Per-activity, com hash SHA-256 do texto, imutável.

### 4.20 Scheduled Applications

- **Tabela:** `scheduled_applications` (com trigger de audit)
- **Estado:** 🔶 Parcial. Tabela e trigger existem no banco. Não identificado componente de UI dedicado no código atual.

---

## 5. Banco de Dados / Supabase

### 5.1 Tabelas existentes

| Tabela | Linhas (colunas principais) | PHI? | Sensível? | RLS? |
|--------|----------------------------|------|-----------|------|
| `profiles` | `id`, `full_name`, `avatar_url`, `country`, `license_number`, `npi`, `locale`, `timezone`, `deleted_at` | Sim (nome, NPI) | Sim | ✅ Self read/update + admin read |
| `user_roles` | `user_id`, `role` (enum: admin/therapist/patient) | Não | Sim (segurança) | ✅ Self read + admin manage |
| `workspaces` | `name`, `slug`, `trial_ends_at`, `deleted_at` | Não | Não | ✅ Member read + owner update |
| `workspace_members` | `workspace_id`, `user_id`, `role` (owner/therapist/supervisor), `deleted_at` | Não | Sim (acesso) | ✅ Same-workspace read + owner manage |
| `workspace_invitations` | `email`, `token`, `role`, `status`, `expires_at` | Sim (email) | Sim | ✅ Owner manage + member read |
| `patients` | `display_name`, `initials`, `tags`, `full_name_encrypted`, `email_encrypted`, `phone_encrypted`, `status`, `deleted_at`, `purged_at`, `workspace_id`, `assigned_therapist_id` | **Sim** (PHI cifrado) | **Sim** | ✅ Workspace read + assigned/owner update |
| `patient_activities` | `workspace_id`, `patient_id`, `activity_id`, `delivery_mode`, `token_hash`, `token_expires_at`, `status`, `used_at` | Não (IDs) | Sim (vínculo) | ✅ Workspace read/insert/update |
| `activity_responses` | `workspace_id`, `patient_id`, `activity_id`, `raw_responses_encrypted`, `score`, `severity`, `scoring_metadata`, `submitted_via` | **Sim** (respostas cifradas) | **Sim** | ✅ Workspace read only |
| `activity_drafts` | `workspace_id`, `patient_id`, `draft_encrypted`, `completion_percent`, `expires_at` | **Sim** (draft cifrado) | **Sim** | ✅ Workspace read only |
| `activity_consents` | `workspace_id`, `patient_id`, `patient_activity_id`, `consent_text_hash`, `accepted`, `ip`, `user_agent` | Não (hash, não texto) | Sim | ✅ Workspace read only |
| `activity_catalog` | `slug`, `title`, `archetype`, `theme`, `config` (JSONB), `category`, `status`, `is_featured` | Não | Não | ✅ Auth read published + admin manage |
| `habit_links` | `workspace_id`, `patient_id`, `activity_id`, `token_hash`, `status`, `expires_at`, `total_entries` | Não (IDs) | Sim | ✅ Workspace read/insert/update |
| `habit_entries` | `workspace_id`, `patient_id`, `activity_id`, `habit_link_id`, `duration_seconds`, `cycles_completed`, `metadata_encrypted` | **Sim** (metadata cifrada) | **Sim** | ✅ Workspace read only |
| `ephemeral_activities` | Similar a `patient_activities` + `purge_after`, `therapist_consent_at`, `therapist_consent_text_hash`, `pdf_download_count` | Não (IDs) | Sim | ✅ Workspace CRUD |
| `ephemeral_responses` | Similar a `activity_responses` + `purged_at`, `response_data_encrypted` | **Sim** (efêmero, purgável) | **Sim** | ✅ Workspace read only |
| `subscriptions` | `workspace_id`, `tier`, `status`, `provider`, `stripe_*`, `limits` (JSONB), `trial_ends_at` | Não | Sim (billing) | ✅ Member read + owner update |
| `stripe_products` | `stripe_price_id`, `stripe_product_id`, `tier`, `unit_amount` | Não | Não | ✅ Auth read active + admin manage |
| `stripe_events` | `id` (Stripe event ID), `type`, `payload` (JSONB), `workspace_id` | Não | Sim (payload) | ✅ Admin read only, deny insert/update/delete from client |
| `audit_logs` | `actor_id`, `workspace_id`, `action`, `resource_type`, `resource_id`, `metadata` (JSONB, **nunca PHI**), `ip`, `user_agent` | **Nunca** | Sim (audit trail) | ✅ Admin read all + owner read own workspace |
| `feature_flags` | `workspace_id`, `flag`, `enabled`, `metadata` | Não | Não | ✅ Member read + owner manage |
| `platform_analytics` | `date`, `hour_bucket`, `metric`, `dimension`, `value` | **Nunca** (desidentificado) | Não | ✅ Admin read only, deny all from client |
| `clinic_waitlist` | `email`, `workspace_id`, `projected_patient_count`, `notes` | Sim (email) | Sim | ✅ Owner insert/read + admin manage |
| `featured_activity_history` | `activity_id`, `set_by`, `set_at` | Não | Não | ✅ Admin read only |
| `scheduled_applications` | `workspace_id`, `patient_id`, `activity_id`, `scheduled_for_date`, `status` | Não (IDs) | Sim | ✅ Workspace read/insert/update |

### 5.2 Funções RPC (SECURITY DEFINER)

| Função | Finalidade |
|--------|-----------|
| `has_role(user_id, role)` | Checa role global sem recursão RLS |
| `is_workspace_member(workspace_id, user_id)` | Checa pertencimento a workspace |
| `has_workspace_role(workspace_id, user_id, role)` | Checa role dentro de workspace |
| `has_feature(workspace_id, flag)` | Checa feature flag |
| `workspace_active_patient_count(workspace_id)` | Conta pacientes ativos |
| `enforce_patient_limit()` | Trigger: bloqueia INSERT se cota atingida |
| `enforce_patient_limit_on_restore()` | Trigger: bloqueia restore se cota atingida |
| `assert_patient_capacity(workspace_id)` | Valida cota (usada por enforce e restore) |
| `restore_patient(patient_id)` | Restaura paciente soft-deleted (com validação de janela 30d + cota) |
| `handle_new_user()` | Trigger `auth.users` AFTER INSERT: cria profile, role, workspace, subscription |
| `purge_expired_patients()` | Purge de PHI de pacientes deletados há 30+ dias |
| `purge_expired_ephemeral_data()` | Purge de dados efêmeros expirados |
| `increment_platform_analytics(...)` | Incrementa métrica no `platform_analytics` |
| `update_updated_at_column()` | Trigger genérico de `updated_at` |
| `audit_*` (10 funções) | Triggers de auditoria (ver seção 4.6) |

### 5.3 Cron jobs

| Job | Frequência | Endpoint | Secret |
|-----|-----------|----------|--------|
| Purge de pacientes | Não identificado no código atual (provavelmente pg_cron externo) | `/api/public/hooks/purge-patients` | `PURGE_HOOK_SECRET` |
| Agregação de analytics | Não identificado no código atual | `/api/public/hooks/aggregate-analytics` | `ANALYTICS_HOOK_SECRET` |
| Purge ephemeral | A cada 15min (pg_cron) | Via `purge_expired_ephemeral_data()` direto | — |

### 5.4 Relações entre tabelas

```
auth.users
  └─ profiles (1:1, via trigger handle_new_user)
  └─ user_roles (1:N)
  └─ workspace_members (N:M com workspaces)

workspaces
  └─ workspace_members (1:N)
  └─ workspace_invitations (1:N)
  └─ subscriptions (1:1)
  └─ feature_flags (1:N)
  └─ patients (1:N)
  └─ audit_logs (1:N)
  └─ platform_analytics (sem FK direta)

patients
  └─ patient_activities (1:N)
  └─ activity_responses (1:N)
  └─ activity_drafts (1:N)
  └─ activity_consents (1:N)
  └─ habit_links (1:N)
  └─ habit_entries (1:N, via habit_link)
  └─ ephemeral_activities (1:N)
  └─ ephemeral_responses (1:N)
  └─ scheduled_applications (1:N)

activity_catalog (referenciado por activity_id em patient_activities, habit_links, etc. — sem FK formal)
```

> **Nota:** Nenhuma tabela tem FK formal para `auth.users` (regra Lovable Cloud). Relações são garantidas por RLS + lógica de negócio.

### 5.5 Dados sensíveis e efêmeros

- **PHI cifrado (AES-256-GCM):** `patients.full_name_encrypted`, `patients.email_encrypted`, `patients.phone_encrypted`, `activity_responses.raw_responses_encrypted`, `activity_drafts.draft_encrypted`, `habit_entries.metadata_encrypted`, `ephemeral_responses.response_data_encrypted`
- **Dados efêmeros:** `ephemeral_responses.response_data_encrypted` — purgado após 24h via `purge_expired_ephemeral_data()`
- **Soft delete com purge:** `patients` — PHI purgado após 30 dias de soft delete

### 5.6 Migrations

48 migrations em `supabase/migrations/`, datadas de 2026-04-27 a 2026-05-03. Nomeadas com UUID. Cobrem criação de todas as tabelas, enums, funções, triggers, RLS policies, e ajustes incrementais.

---

## 6. Billing / Stripe

### Onde ficam as funções

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/features/billing/stripe.server.ts` | Singleton do Stripe SDK + mode detection (test/live) |
| `src/features/billing/billing.functions.ts` | Server functions: `createCheckoutSession`, `createPortalSession`, `getSubscriptionDetails` |
| `src/features/billing/admin.functions.ts` | Server functions admin: listar subscriptions, sync manual |
| `src/features/billing/plan.server.ts` | `getWorkspacePlan()` — lê e normaliza plano efetivo |
| `src/features/billing/trial-status.ts` | Hook/helper para verificar status do trial no client |
| `src/features/billing/TrialExpiredBanner.tsx` | Banner visual de trial expirado |
| `src/routes/api/public/stripe-webhook.ts` | Webhook handler (HMAC-verified) |
| `src/routes/_authenticated/settings.billing.tsx` | UI de billing para o terapeuta |

### Identificação de planos

Tiers definidos no enum `subscription_tier`:
- `solo` (legado, equiv. trial) — max 5 pacientes
- `basic` — max 20 pacientes
- `practice` — max 50 pacientes
- `clinic` — ilimitado (futuro)
- `patient` — B2C (futuro)

Preços via secrets: `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_PRACTICE` → IDs de price do Stripe.

### Aplicação de limites

1. **Server-side (plan.server.ts):** `getWorkspacePlan()` retorna `max_patients`, `max_activities`, `max_reports` com defaults por tier.
2. **Trigger no banco:** `enforce_patient_limit()` bloqueia INSERT em `patients` se cota atingida.
3. **Trigger no banco:** `enforce_patient_limit_on_restore()` bloqueia restauração se cota atingida.
4. **UI:** `PatientLimitBanner.tsx` + `PatientLimitModal.tsx` mostram upgrade prompt.

### Webhook

`stripe-webhook.ts` verifica assinatura HMAC via `STRIPE_WEBHOOK_SECRET`, processa eventos `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`. Atualiza `subscriptions` e grava em `stripe_events`.

### Verificação de acesso por plano

- `plan.server.ts` é a ÚNICA porta de entrada para ler plano em features que não são billing.
- Compliance Report é gated ao Practice (`max_reports` > 0).
- Funcionalidades futuras (MFA obrigatório, etc.) usarão `has_feature()` + `getWorkspacePlan()`.

---

## 7. Autenticação e Permissões

### Fluxo de login

1. **Email/senha:** `src/routes/login.tsx` → `supabase.auth.signInWithPassword()`
2. **Google OAuth:** `GoogleButton.tsx` → `supabase.auth.signInWithOAuth({ provider: 'google' })` → `/auth/callback`
3. **Signup:** `src/routes/signup.tsx` → `supabase.auth.signUp()` → email de confirmação (auto-confirm desligado)
4. **Callback:** `src/routes/auth.callback.tsx` → exchange code → redirect to `/dashboard`
5. **Reset:** `forgot-password.tsx` → `resetPasswordForEmail()` → `reset-password.tsx` → `updateUser({ password })`

### Roles globais (`user_roles`)

| Role | Quem | Poder |
|------|------|-------|
| `admin` | Exclusivo `admin@terapily.com` | SELECT em todas as tabelas, gerenciar `activity_catalog`, `user_roles` |
| `therapist` | Todo terapeuta que faz signup | Acesso ao workspace |
| `patient` | Reservado (futuro B2C) | Não implementado |

### Roles por workspace (`workspace_members.role`)

| Role | Poder |
|------|-------|
| `owner` | Tudo no workspace: billing, settings, todos os pacientes, convites |
| `therapist` | Só pacientes atribuídos a ele |
| `supervisor` | Reservado (Clinic, futuro) |

### Proteção de rotas

1. `src/routes/_authenticated.tsx` → `beforeLoad` verifica `context.auth.isAuthenticated`. Redireciona para `/login`.
2. `src/routes/_authenticated/admin.tsx` → `beforeLoad` verifica `has_role('admin')`. Redireciona para `/dashboard` se não admin.
3. RLS no banco garante isolamento de dados por workspace.
4. Server functions usam `requireSupabaseAuth` middleware para validar sessão.

### Riscos de bypass

- **Rate limit em memória do worker** — não distribuído. Single-use do token mitiga, mas atacante determinado poderia forçar múltiplos tokens.
- **Service role em server functions** — se uma server function vazar dados sem verificar workspace membership, há risco de cross-tenant.
- **MFA ausente** — até S5, não há 2FA. Risco aceito (pré-launch).
- **RLS sem FK formal** — relações são por convenção (`workspace_id`), não por FK. Um bug no código poderia permitir inserir dados com workspace_id errado (mitigado pelas policies de INSERT).

---

## 8. Relatórios e PDFs

### Geradores existentes

| Gerador | Arquivo server | Arquivo functions | Variantes | Atividades que usam | Tipo |
|---------|---------------|-------------------|-----------|---------------------|------|
| **Scale Result PDF** | `scale-result-pdf.server.ts` (717 linhas) | `scale-result-pdf.functions.ts` | Paciente + Terapeuta | Todas as 33 escalas validadas (`quiz_scale`) | Dados preenchidos (score, severity, item-by-item) |
| **Worksheet Result PDF** | `worksheet-result-pdf.server.ts` (642 linhas) | `worksheet-result-pdf.functions.ts` | Paciente + Terapeuta | Todos os worksheets (`structured_form`) + guided_script com reflexões | Dados preenchidos (respostas, emotion bars, sliders) |
| **Drag-Drop Result PDF** | `drag-drop-result-pdf.server.ts` (845 linhas) | `drag-drop-result-pdf.functions.ts` | Paciente + Terapeuta | Atividades `drag_drop` (card_sort, ranking_ladder, cycle_builder) | Dados preenchidos (categorização, métricas derivadas) |
| **Habit Report PDF** | `habit-report.server.ts` (1176 linhas) | `habit-report.functions.ts` | Paciente + Terapeuta | Atividades de mindfulness via habit tracker | Dados preenchidos (heatmap, streaks, consistency index) |
| **Compliance Report PDF** | `compliance-report.server.ts` (1306 linhas) | `compliance-report.functions.ts` | Única (terapeuta, gated ao Practice) | Todas as atividades de um paciente | Dados preenchidos (histórico completo, scores, flags, audit trail) |
| **Audit Export** | — | `audit-export.functions.ts` | Única (admin) | — | Exportação de audit logs |

### Templates

- Todos os PDFs usam `pdf-brand-assets.server.ts` como **ÚNICO source de base64** para logo, ícones e watermark.
- Templates estão travados (locked) por decisão de design. Ver `mem://design/compliance-report-template`, `mem://features/worksheet-result-pdf`, `mem://features/drag-drop-result-pdf`, `mem://features/habit-report-pdf-template`.

### Paciente vs Terapeuta

| Variante | Dados sensíveis | Disclaimers | Clinical flags |
|----------|----------------|-------------|----------------|
| **Paciente** | `display_name` (não-PHI), sem dados de contato | "This is not a diagnosis", non-diagnosis footer | Não (motivacional) |
| **Terapeuta** | `full_name_encrypted` decifrado, contato se disponível | "Clinician Copy" warning band, "For professional use only" | Sim (ACTIVE, MONITORING, ACKNOWLEDGED) |

### Duplicidade e riscos

- Não há duplicidade entre geradores — cada um cobre um arquétipo diferente.
- **Risco:** `compliance-report.server.ts` (1306 linhas) é o maior arquivo server e agrega dados de todos os outros. Mudança em qualquer gerador pode afetar o compliance report.
- **Risco:** Os 5 geradores compartilham `pdf-brand-assets.server.ts`. Mudança neste arquivo afeta todos os PDFs.

---

## 9. Acervo / Biblioteca Clínica

### Como os cards são criados

**Dual-source:**
1. **Banco (`activity_catalog`):** Fonte de verdade. Atividades com `status = 'published'` são lidas via `listAvailableActivities()` em server function.
2. **Seed data (`src/features/library/seed-data.ts`, 615 linhas):** Fallback estático hardcoded. Usado quando o banco não tem atividades de todos os arquétipos. Marcado como TEMPORÁRIO.

### Categorias

Definidas em `seed-data.ts` como `CATEGORIES` (3 categorias: Worksheets, CBT essentials, Mindfulness & grounding). Adicionalmente, rotas dedicadas: `/scales`, `/mindfulness`, `/worksheets`, `/cbt`.

### Capas/Imagens

Sem imagens reais. Cards usam ilustrações SVG abstratas via `src/features/library/illustrations.tsx` (8 variantes: petals, tide, lattice, horizon, spiral, scattered, anchor, compass).

### Favoritos

❌ **Não implementado.** Não há tabela `favorites`, componente de favoritos, nem lógica de favoritos.

### "Mais acessados"

❌ **Não implementado** como feature dedicada. `platform_analytics` pode ter métricas de acesso, mas não há ranking visual "mais acessados".

### `is_featured`

Coluna booleana em `activity_catalog` + tabela `featured_activity_history`. Admin pode marcar uma atividade como featured. Usado no `LibraryHero.tsx`.

### Modularização potencial

O acervo já tem separação clara: `seed-data.ts` → dados, `archetypes.ts` → contratos, `runners/` → players por arquétipo, `library.types.ts` → tipos. Para virar módulo independente, precisaria:
- Remover dependência de `seed-data.ts` (migrar tudo pro banco)
- Abstrair a interface entre acervo e `patient_activities` (hoje acoplada via `activities.functions.ts`)

---

## 10. Atividades Clínicas

### Escalas Validadas (quiz_scale) — 33 no banco + 3 no seed-data

| Nome | Slug | Categoria | Coleta dados? | Score? | Relatório | Clinical flag? | Psicoeducação? |
|------|------|-----------|--------------|--------|-----------|----------------|----------------|
| PHQ-9 | `phq-9` | depression | Sim | Sim (sum, 0-27) | Scale Result PDF (pac + ter) | Sim (≥20 severe) | Introdução |
| GAD-7 | `gad-7` | anxiety | Sim | Sim (sum, 0-21) | Scale Result PDF | Sim (≥15 severe) | Introdução |
| PCL-5 | `pcl-5` | trauma | Sim | Sim (sum, 0-80) | Scale Result PDF | Sim (≥33) | Introdução |
| PHQ-2 | `phq-2` | depression | Sim | Sim (sum, 0-6) | Scale Result PDF | Sim (≥3) | Introdução |
| GAD-2 | `gad-2` | anxiety | Sim | Sim (sum, 0-6) | Scale Result PDF | Sim (≥3) | Introdução |
| C-SSRS Screener | `c-ssrs` | crisis | Sim | Sim (categorical) | Scale Result PDF | Sim (always) | Introdução |
| AUDIT | `audit` | substance | Sim | Sim (sum, 0-40) | Scale Result PDF | Sim | Introdução |
| AUDIT-C | `audit-c` | substance | Sim | Sim (sum, 0-12) | Scale Result PDF | Sim | Introdução |
| DAST-10 | `dast-10` | substance | Sim | Sim (sum, 0-10) | Scale Result PDF | Sim | Introdução |
| PSS-10 | `pss-10` | stress | Sim | Sim (sum, 0-40) | Scale Result PDF | Não | Introdução |
| BDI-II | Não no seed-data, no banco | depression | Sim | Sim | Scale Result PDF | Sim | Introdução |
| ... (28 escalas adicionais no banco) | — | Várias | Sim | Sim | Scale Result PDF | Conforme config | Introdução |

> **Nota:** A lista completa de 33 escalas está na tabela `activity_catalog` com `archetype = 'quiz_scale'`. O scoring engine é genérico — lê `config.scoring` e `config.severity_bands` do JSONB.

### Worksheets (structured_form) — 15 no seed-data

| Nome | Slug | Categoria | Coleta dados? | Score? | Relatório | Psicoeducação? |
|------|------|-----------|--------------|--------|-----------|----------------|
| Thought Record 7-col | `thought-record-7col` | worksheets | Sim | Não | Worksheet Result PDF | Não |
| Behavioral Activation Log | `behavioral-activation-log` | worksheets | Sim | Não | Worksheet Result PDF | Não |
| Worry Time Worksheet | `worry-time` | worksheets | Sim | Não | Worksheet Result PDF | Não |
| Behavioral Experiment | `behavioral-experiment` | worksheets | Sim | Não | Worksheet Result PDF | Não |
| Values Compass | `values-compass` | worksheets | Sim | Não | Worksheet Result PDF | Não |
| Defusion Exercise Log | `defusion-log` | worksheets | Sim | Não | Worksheet Result PDF | Não |
| Emotion Regulation Diary | `emotion-regulation-diary` | worksheets | Sim | Não | Worksheet Result PDF | Não |
| DEAR MAN | `dear-man` | worksheets | Sim | Não | Worksheet Result PDF | Não |
| Distress Tolerance Plan | `distress-tolerance-plan` | worksheets | Sim | Não | Worksheet Result PDF | Não |
| Safety Plan | `safety-plan` | worksheets | Sim (`in_session` only) | Não | Worksheet Result PDF | Não |
| Grounding Journal | `grounding-journal` | worksheets | Sim | Não | Worksheet Result PDF | Não |
| Sleep Hygiene Checklist | `sleep-hygiene-checklist` | worksheets | Sim | Não | Worksheet Result PDF | Sim |
| Gratitude Journal | `gratitude-journal` | worksheets | Sim | Não | Worksheet Result PDF | Não |
| Self-Compassion Letter | `self-compassion-letter` | worksheets | Sim | Não | Worksheet Result PDF | Não |
| Communication Repair | `communication-repair` | worksheets | Sim | Não | Worksheet Result PDF | Não |
| SMART Goal Setting | `smart-goal` | worksheets | Sim | Não | Worksheet Result PDF | Não |

### CBT / Drag-Drop (drag_drop)

| Nome | Slug | Categoria | Sub-modo | Coleta dados? | Score? | Relatório |
|------|------|-----------|----------|--------------|--------|-----------|
| Distorções Cognitivas | `cognitive-distortions-tagging` | cbt | card_sort | Sim | Sim (accuracy) | Drag-Drop Result PDF |
| Evidências a Favor e Contra | `evidence-for-against` | cbt | structured_form | Sim | Não | Worksheet Result PDF |
| Outros no banco (ACT Values Card Sort, Exposure Hierarchy, Cognitive Cycle, Thinking Traps, DBT Pros-Cons, Costs of Avoidance) | Vários | cbt/act/dbt | card_sort, ranking_ladder, cycle_builder | Sim | Sim (derivado) | Drag-Drop Result PDF |

### Mindfulness (guided_timer + guided_script) — 20 atividades

| Nome | Slug | Código | Arquétipo | Subcategoria | Coleta dados? | Score? | Relatório |
|------|------|--------|-----------|-------------|--------------|--------|-----------|
| Respiração 4-7-8 | `respiracao-4-7-8` | MIN-01 | guided_timer | breathing | Sim (completion) | Não | Habit Report PDF |
| Respiração quadrada | `respiracao-quadrada` | MIN-02 | guided_timer | breathing | Sim | Não | Habit Report PDF |
| Respiração diafragmática | `respiracao-diafragmatica` | MIN-03 | guided_timer | breathing | Sim | Não | Habit Report PDF |
| Respiração alternada | `respiracao-alternada` | MIN-04 | guided_timer | breathing | Sim | Não | Habit Report PDF |
| Body Scan | `body-scan` | MIN-05 | guided_script | body-scan | Sim (reflexões) | Não | Worksheet Result PDF |
| Body Scan Rápido | `body-scan-rapido` | MIN-06 | guided_script | body-scan | Sim | Não | Worksheet Result PDF |
| PMR | `relaxamento-muscular-progressivo` | MIN-07 | guided_timer | relaxation | Sim | Não | Habit Report PDF |
| PMR Rápido | `pmr-rapido` | MIN-08 | guided_timer | relaxation | Sim | Não | Habit Report PDF |
| Lugar Seguro | `lugar-seguro` | MIN-09 | guided_script | grounding | Sim (reflexões) | Não | Worksheet Result PDF |
| Grounding Sensorial | `grounding-sensorial` | MIN-10 | guided_script | grounding | Sim | Não | Worksheet Result PDF |
| Mindful Breathing | `mindful-breathing` | MIN-11 | guided_timer | meditation | Sim | Não | Habit Report PDF |
| Loving-Kindness | `loving-kindness` | MIN-12 | guided_script | meditation | Sim (reflexões) | Não | Worksheet Result PDF |
| Observação Consciente | `observacao-consciente` | MIN-13 | guided_script | attention | Sim | Não | Worksheet Result PDF |
| Mindful Eating | `mindful-eating` | MIN-14 | guided_script | informal | Sim | Não | Worksheet Result PDF |
| Mindful Walking | `mindful-walking` | MIN-15 | guided_script | informal | Sim | Não | Worksheet Result PDF |
| R.A.I.N. | `rain-meditation` | MIN-16 | guided_script | defusion | Sim | Não | Worksheet Result PDF |
| S.T.O.P. | `stop-skill` | MIN-17 | guided_script | micro-practices | Sim | Não | Worksheet Result PDF |
| Leaves on a Stream | `leaves-on-stream` | MIN-18 | guided_script | defusion | Sim | Não | Worksheet Result PDF |
| 3-min Breathing Space | `3min-breathing-space` | MIN-19 | guided_timer | micro-practices | Sim | Não | Habit Report PDF |
| Body Scan Compassivo | `compassionate-body-scan` | MIN-20 | guided_script | self-compassion | Sim | Não | Worksheet Result PDF |

Todas as 20 atividades de mindfulness suportam modo `in_session` + `shared_link` + `both`.

### Ancoragem 5-4-3-2-1

| Nome | Slug | Código | Arquétipo | Subcategoria |
|------|------|--------|-----------|-------------|
| Ancoragem 5-4-3-2-1 | `ancoragem-5-4-3-2-1` | TRA-02 | guided_script | grounding |

---

## 11. Duplicações e Legado

### Arquivos duplicados / redundantes

| Arquivo | Observação |
|---------|-----------|
| `src/features/patients/PatientLimitBanner.tsx` | **Duplicado** de `src/features/patients/components/PatientLimitBanner.tsx` |
| `src/features/patients/PatientLimitModal.tsx` | **Duplicado** de `src/features/patients/components/PatientLimitModal.tsx` |
| `src/features/library/seed-data.ts` | **Legado declarado.** Fallback estático; fonte de verdade é o banco. Deve ser removido quando todas atividades estiverem no `activity_catalog`. |

### Geradores de PDF antigos

Não identificado gerador de PDF "antigo" separado. Todos os geradores atuais são os definitivos (templates travados).

### Rotas antigas

| Rota | Observação |
|------|-----------|
| `/dev/roadmap` | Rota dev-only com dados estáticos do roadmap. Pode ser removida em produção. |

### Templates não usados

| Arquivo | Observação |
|---------|-----------|
| `src/features/games/_core/` | Shell vazio — `GameShell.tsx`, `ShareableLink.tsx`, `game.types.ts`, `useGameSession.ts`, `README.md`. Nenhuma atividade usa este módulo. Pode ser considerado dead code. |

### Funções potencialmente mortas

- `src/features/dev/activityRoadmap.ts` — dados estáticos do roadmap de desenvolvimento. Não é usado em produção.
- `src/features/activities/og-meta.functions.ts` + `og-meta.server.ts` — Open Graph meta para magic links. Funcional, mas raramente testado.

### Dependências frágeis

- `pdf-brand-assets.server.ts` — SPOF (Single Point of Failure) para todos os PDFs. Se os base64 forem corrompidos, todos os 5 geradores quebram.
- `scoring.server.ts` (208 linhas) — Engine genérica. Se quebrar, todas as 33 escalas perdem auto-scoring.

### Código provisório

- Comentários `// TEMPORÁRIO` em `seed-data.ts` indicam intenção de remoção.
- `subscription_tier` enum inclui `solo` como "legado" de trial.

---

## 12. Pontos de Acoplamento

### Arquivos muito grandes

| Arquivo | Linhas | Risco |
|---------|--------|-------|
| `src/routes/index.tsx` | 1855 | Landing page monolítica. Difícil de manter. |
| `src/routes/_authenticated/patients.$id.tsx` | 1882 | Maior rota. Concentra perfil, atividades, habit tracker, relatórios, actions. |
| `src/features/activities/compliance-report.server.ts` | 1306 | Agrega dados de todas as features. |
| `src/features/activities/activities.functions.ts` | 1295 | Hub de server functions de atividades. |
| `src/features/habits/habit-report.server.ts` | 1176 | Complexo (heatmap, streaks, consistency index). |
| `src/routes/h.$token.tsx` | 977 | Rota pública do habit tracker — bastante lógica inline. |
| `src/routes/_authenticated/admin.analytics.tsx` | 1064 | Dashboard analítico do admin. |
| `src/features/activities/drag-drop-result-pdf.server.ts` | 845 | 3 sub-modos de drag-drop. |

### Features misturadas em `patients.$id.tsx`

Este arquivo (1882 linhas) concentra:
- Perfil do paciente (dados, contato criptografado)
- Lista de atividades (patient_activities)
- Hab tracker (habit links/entries)
- Atividades efêmeras (ephemeral)
- Scheduled applications
- Botões de ação (flag, relatório paciente, relatório terapeuta, revogar, gerar link)
- Player dialog (InSessionPlayerDialog)
- ResponseDetailDrawer
- ScoreEvolutionChart

**Recomendação:** Extrair em sub-componentes por domínio.

### Componentes com muitas dependências

| Componente | Depende de |
|-----------|-----------|
| `ActivityPlayer.tsx` | `FormRunner`, `BreathingRunner`, `GuidedScriptRunner`, `DragDropRunner`, `ConsentGate`, `VinhetaIntro`, `ScaleIntro`, scoring engine, crypto |
| `compliance-report.server.ts` | `plan.server.ts`, `encryption.server.ts`, `pdf-brand-assets.server.ts`, `scoring.server.ts`, `clinical-flag.server.ts`, todas as tabelas |
| `patients.$id.tsx` | `activities.functions.ts`, `habits.functions.ts`, `ephemeral.functions.ts`, `patients.functions.ts`, `compliance-report.functions.ts`, `scale-result-pdf.functions.ts`, `worksheet-result-pdf.functions.ts`, `drag-drop-result-pdf.functions.ts`, `habit-report.functions.ts`, `consent.functions.ts` |

### Onde separar Core e Modules faria sentido

- **Core:** auth, workspace, patients, billing, audit, crypto, tokens, rate-limit, scoring engine, pdf-brand-assets
- **Modules:** cada arquétipo (quiz_scale, structured_form, guided_timer, guided_script, drag_drop), habit tracker, ephemeral links, analytics, compliance report

---

## 13. Recomendação de Modularização

> **Nota:** Estas são recomendações descritivas. Nenhuma implementação foi feita.

### O que deveria virar Core

```
src/core/
├── auth/               AuthProvider, middleware, profile
├── workspace/           Multi-tenant, workspace functions
├── patients/            CRUD, soft delete, restore, limite
├── billing/             Stripe, plan.server, trial
├── audit/               audit.server.ts, audit triggers
├── crypto/              encryption.server.ts (AES-256-GCM)
├── tokens/              magic-link.server.ts
├── rate-limit/          public-link.server.ts
├── scoring/             scoring.server.ts (engine genérica)
├── pdf/                 pdf-brand-assets.server.ts
├── validation/          schemas.ts (Zod)
└── components/          brand/, layout/, feedback/, ui/
```

### O que deveria virar Module

```
src/modules/
├── quiz-scale/          FormRunner (quiz mode), scale-result-pdf, severity bands
├── structured-form/     FormRunner (form mode), worksheet-result-pdf
├── guided-timer/        BreathingRunner, guided_timer configs
├── guided-script/       GuidedScriptRunner, script configs
├── drag-drop/           DragDropRunner, 3 sub-layouts, drag-drop-result-pdf
├── habit-tracker/       HabitTrackingTab, habit links/entries, habit-report
├── ephemeral/           Ephemeral links, countdown badge, purge
├── compliance/          Compliance report, admin compliance console
├── analytics/           Platform analytics, aggregator, dashboard
└── library/             Acervo browser, cards, categories, seed-data (remover)
```

### Module Registry (conceito)

```typescript
interface TerapilyModule {
  id: string;
  name: string;
  archetypeId?: ArchetypeId;
  routes?: RouteConfig[];
  serverFunctions?: ServerFunction[];
  pdfGenerators?: PdfGenerator[];
  dbTables?: string[];
  dependencies: string[]; // IDs de outros módulos ou core
}
```

Cada módulo registraria suas rotas, server functions, geradores de PDF e tabelas. O Core carregaria módulos dinamicamente.

### Arquivos que precisariam mudar

- `src/routes/_authenticated/patients.$id.tsx` — extrair tabs por módulo
- `src/features/activities/activities.functions.ts` — dividir por arquétipo
- `src/features/library/seed-data.ts` — migrar restante pro banco e deletar
- `src/routeTree.gen.ts` — auto-gerado, se adaptaria

### Arquivos que NÃO deveriam ser mexidos

- `src/integrations/supabase/client.ts` (auto-gerado)
- `src/integrations/supabase/types.ts` (auto-gerado)
- `.env` (auto-gerado)
- `supabase/config.toml` (settings do projeto)
- `pdf-brand-assets.server.ts` (fonte única de assets de marca)
- `scoring.server.ts` (engine genérica estável)

### Feature piloto ideal para modularização

**Habit Tracker** — razões:
1. Já é relativamente isolado (`src/features/habits/`)
2. Tem tabelas próprias (`habit_links`, `habit_entries`)
3. Tem rota pública própria (`/h/$token`)
4. Tem gerador de PDF próprio (`habit-report.server.ts`)
5. Dependência do Core é mínima (crypto, tokens, rate-limit, pdf-brand-assets)
6. Não afeta escalas, worksheets ou drag-drop

---

## 14. Checklist Final

| Área | Estado Atual | Risco | Prioridade | Recomendação |
|------|-------------|-------|------------|--------------|
| **Auth** | ✅ Funcional | Médio (sem MFA) | S5 | Implementar TOTP conforme planejado |
| **Patients** | ✅ Funcional | Baixo | — | Estável |
| **Patient Detail** | ✅ Funcional | 🔴 Alto (1882 linhas, muitas responsabilidades) | Alta | Extrair em sub-componentes por domínio |
| **Billing** | ✅ Funcional (test mode) | Médio | S2 | Ativar live mode quando BAA assinado |
| **Audit** | ✅ Funcional | Baixo | — | Cobertura ampla, estável |
| **Landing page** | ✅ Funcional | 🟡 Médio (1855 linhas monolíticas) | Média | Extrair seções em componentes |
| **Escalas (33)** | ✅ Funcional | Baixo | — | Engine genérica estável |
| **Worksheets (15)** | ✅ Funcional | Baixo | — | Runner estável |
| **Mindfulness (20)** | ✅ Funcional | Baixo | — | Runners estáveis |
| **Drag-Drop (6+)** | ✅ Funcional | Baixo | — | 3 sub-modos estáveis |
| **Habit Tracker** | ✅ Funcional | Baixo | — | Candidato a módulo piloto |
| **Ephemeral Links** | ✅ Funcional | Baixo | — | Purge automático ativo |
| **PDFs (5 geradores)** | ✅ Funcional | 🟡 Médio (compliance report = 1306 linhas) | Média | Monitorar complexidade do compliance report |
| **PDF Brand Assets** | ✅ Funcional | 🔴 Alto (SPOF para todos os PDFs) | Alta | Considerar redundância ou validação automática |
| **Seed data** | 🔶 Legado declarado | 🟡 Médio (dual-source pode causar inconsistência) | Média | Migrar tudo pro banco e remover |
| **Games module** | 🔶 Placeholder vazio | Baixo (dead code) | Baixa | Remover ou implementar |
| **Favorites** | ❌ Não existe | Nenhum | — | Implementar se necessário |
| **Scheduled Applications** | 🔶 Parcial (banco OK, UI ausente) | Baixo | Baixa | Implementar UI ou remover tabela |
| **Patient duplicates** | 🟡 2 arquivos duplicados (PatientLimitBanner, PatientLimitModal) | Baixo | Baixa | Unificar |
| **Dev roadmap** | 🔶 Dev-only | Nenhum | — | Remover antes de produção |
| **Rate limit** | 🔶 Em memória do worker (não distribuído) | 🟡 Médio | S5/S6 | Migrar para solução distribuída |
| **MFA** | ❌ Não implementado | 🟡 Médio (pré-launch) | S5 | TOTP + gating por plano |
| **Email transacional** | ❌ Desligado (sem BAA Resend) | Baixo (workaround funcional) | S4-S5 | Ativar após BAA |
| **Admin compliance** | ✅ Funcional | Baixo | — | Toda nova tabela deve incluir admin read all |
| **Cross-tenant isolation** | ✅ RLS + workspace_id | 🟡 Médio (sem FK formal) | — | Manter vigilância em server functions |
| **PHI encryption** | ✅ AES-256-GCM | Baixo | — | Key rotation planejada (docs/key-rotation.md) |
| **Modularização** | ❌ Não implementada | 🟡 Médio (acoplamento crescente) | Média | Começar pelo Habit Tracker como piloto |

---

*Documento gerado automaticamente a partir da análise do código-fonte. Nenhum arquivo funcional foi alterado.*
