# Terapily — Arquitetura

## Visão geral

Terapily é uma plataforma para psicoterapeutas (e, no futuro, pacientes B2C). A arquitetura é construída para suportar **4 planos** sem refatoração estrutural, mesmo que a Semana 1 entregue apenas o plano básico.

- **Frontend:** React 19 + TanStack Start (SSR) + Tailwind v4.
- **Backend:** Lovable Cloud (PostgreSQL + Auth + Edge Functions).
- **Server functions:** TanStack `createServerFn` com middleware `requireSupabaseAuth` + Zod + `withAudit()`.
- **Segurança:** RLS em todas as tabelas, roles separados em `user_roles` (global) e `workspace_members` (escopo de workspace).

## Camadas

```
┌───────────────────────────────┐
│ React UI (apenas apresentação)│
├───────────────────────────────┤
│ Server functions (Zod + audit)│
├───────────────────────────────┤
│ Postgres + RLS (verdade real) │
└───────────────────────────────┘
```

**Regra inviolável:** o frontend nunca é fonte de verdade para permissão. Toda regra crítica é validada no backend/RLS.

## Future plan architecture

A arquitetura suporta 4 planos. Apenas **Basic** e **Practice** são implementados ativamente; **Clinic** e **Patient** estão preparados estruturalmente mas não implementados.

| Plano | Status | Terapeutas | Workspace | Notas |
|---|---|---|---|---|
| **Basic** | implementado | 1 | 1 workspace solo | MVP atual |
| **Practice** | implementado | até 2 | 1 workspace compartilhado | Owner + 1 therapist convidado |
| **Clinic** | **futuro** | até 10 | 1 workspace = clínica | Owner + supervisor + therapists |
| **Patient** (B2C) | **futuro** | 0 | sem workspace clínico | Conta própria do paciente |

### O que sustenta os 4 planos hoje

- `subscription_tier` enum: `basic`, `practice`, `clinic`, `patient` (e `solo` legado).
- `subscriptions.limits jsonb`: campo declarativo para `max_therapists`, `max_patients` etc. **Nunca é fonte de verdade para segurança** — apenas referência para UI/billing.
- `app_role` enum global: `admin`, `therapist`, `patient`.
- `workspace_role` enum: `owner`, `therapist`, `supervisor`.
- RLS já genérica via `is_workspace_member()` e `has_workspace_role()`.

### O que ainda precisará ser ajustado quando Clinic/Patient entrarem

1. **Patient B2C:** o trigger `handle_new_user` hoje cria sempre um workspace solo. Quando Patient B2C entrar, o trigger precisará ler `raw_user_meta_data->>'account_type'` e pular a criação de workspace para `account_type = 'patient'`.
2. **Vínculo terapeuta ↔ paciente B2C:** será necessária uma tabela `therapist_patient_links` com consentimento explícito.
3. **Limites por plano:** server functions precisarão checar `subscriptions.limits.max_therapists` antes de aceitar convites em Practice/Clinic.

Nenhum desses ajustes exige refator estrutural — são adições incrementais.

## Documentos relacionados

- [`security.md`](./security.md) — RLS, roles, audit, encryption.
- [`database-schema.md`](./database-schema.md) — tabelas, enums, triggers.
- [`roadmap.md`](./roadmap.md) — cronograma 6 semanas.
- [`brand.md`](./brand.md) — identidade visual.
