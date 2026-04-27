# Terapily

> Onde começa uma terapia melhor.

Terapily é o sistema silencioso por trás de uma terapia melhor — atividades, jogos terapêuticos e fluxo clínico para psicólogos TCC. Construído por uma clínica.

## Stack

- **React 19** + **TanStack Start** (file-based routing, SSR-ready)
- **Tailwind CSS v4** com tokens semânticos no `src/styles.css`
- **shadcn/ui** customizado para a paleta Terapily
- **Lovable Cloud** (PostgreSQL + Auth + Storage + Edge Functions)
- **TanStack Query** para data fetching
- **Zod** para validação compartilhada client + server

## Identidade visual

Paleta oficial (Brand Book v3 · 2026):

| Nome | Hex | Uso |
|---|---|---|
| Sage | `#7E9B86` | Primária. Estados ativos / sucesso. |
| Navy | `#1F2A36` | Autoridade, manchetes. Substitui preto. |
| Cream | `#F4EFE6` | Fundo padrão. |
| Mauve | `#B89BA3` | Acento decorativo (≤8%). |
| Charcoal | `#3A3F47` | Texto corrido. |

**Tipografia:** Cormorant (display, serif) + Inter (UI, sans).
**Proporção:** 60% Cream · 30% Navy · 10% Sage ou Mauve.

## Estrutura

```text
src/
  routes/                # File-based routing (TanStack Start)
  features/              # Lógica isolada por domínio
    auth/
    workspace/
    subscription/
    feature-flags/
    audit/               # SERVER-ONLY (audit.server.ts)
    games/
      _core/             # Contrato + shell + hook compartilhado
  components/
    ui/                  # shadcn customizado
    brand/               # Logo, Eyebrow
    feedback/            # EmptyState, ErrorBoundary
    layout/              # AppShell, Sidebar, Header
  integrations/
    supabase/            # client.ts (browser), client.server.ts (admin), auth-middleware.ts
  lib/
    crypto/              # encryptPHI / decryptPHI (passthrough na S1, AES-GCM na S2)
    validation/          # Zod schemas compartilhados
    constants.ts
    utils.ts
  hooks/
  styles.css             # Tailwind v4 + tokens Terapily

docs/
  brand.md
  database-schema.md
  rls-policies.md
  decisions/             # ADRs
```

## Princípios não-negociáveis

1. **Nada de UI sem backend real.** Telas com dados consomem o banco com RLS. Quando algo ainda não existe, vira `<EmptyState>` honesto com badge `Em breve · Semana X`.
2. **Toda mutação:** Zod → server function autenticada → RLS → audit log.
3. **Roles em tabela separada** (`user_roles`) com função `has_role()` SECURITY DEFINER. Nunca em `profiles`.
4. **Multi-tenant** via `workspaces` + `workspace_members` desde o dia 1. RLS via `is_workspace_member()`.
5. **`audit_logs`** com `INSERT REVOKED` do client. Só via trigger SECURITY DEFINER ou server function com service_role.
6. **PHI** sempre passa por `encryptPHI()` antes de armazenar.
7. **Soft delete** (`deleted_at`) em todas as tabelas de domínio.

## Planos previstos

A arquitetura suporta 4 planos desde a fundação. Apenas **Basic** e **Practice** entram no MVP; **Clinic** e **Patient** ficam latentes (enums, RLS e tabelas já preparados, sem refator estrutural futuro).

| Plano | Público | Limite | Status |
|---|---|---|---|
| **Basic** | Terapeuta solo | 1 terapeuta | MVP (S1+) |
| **Practice** | Pequena prática | até 2 terapeutas | MVP (S2+) |
| **Clinic** | Clínica | até 10 terapeutas | Futuro |
| **Patient** | Paciente B2C | acesso próprio + compartilhamento por consentimento | Futuro |

Detalhes em [`docs/architecture.md`](docs/architecture.md) → *Future plan architecture*.

## Roadmap (6 semanas)

- **S1** ✅ — Fundação: auth, workspaces, RLS, audit, brand visual, 4-plan-ready
- **S2** — Pacientes (CRUD) + billing real + encryption AES-GCM-256
- **S3** — Tarefas (homework) + estrutura de jogos + Anatomia da Ansiedade
- **S4** — Notas de sessão + modo escuro
- **S5** — Agenda + MFA real + delete account
- **S6** — Polimento + launch

Detalhes em [`docs/roadmap.md`](docs/roadmap.md).

## Desenvolvimento local

```bash
bun install
bun run dev          # dev server (porta 3000)
bun run build        # build de produção
bunx tsc --noEmit    # typecheck
```

### Variáveis de ambiente

Copie `.env.example` para `.env` e preencha. No Lovable Cloud as variáveis são injetadas automaticamente — `.env` só importa para clones locais via GitHub.

| Variável | Escopo | Descrição |
|---|---|---|
| `VITE_SUPABASE_URL` | client | URL pública do projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | client | Anon key (segura no bundle, RLS protege) |
| `VITE_SUPABASE_PROJECT_ID` | client | Ref do projeto |
| `SUPABASE_URL` | server | Mesma URL acima, para `*.server.ts` |
| `SUPABASE_SERVICE_ROLE_KEY` | server | **Bypass RLS — nunca expor ao client.** Apenas em arquivos `.server.ts` ou edge functions. |

### Migrations

Todas as migrations vivem em `supabase/migrations/` e são aplicadas automaticamente pelo Lovable Cloud. Para aplicar manualmente em ambientes externos:

```bash
supabase db push    # requer Supabase CLI + projeto linkado
```

Ordem cronológica dos arquivos é preservada via prefixo timestamp (`YYYYMMDDHHMMSS_*.sql`). Nunca editar migration já aplicada — sempre criar nova.

## Workspaces e isolamento

Cada usuário cadastrado recebe automaticamente:

1. Um **profile** (`public.profiles`).
2. Uma **role global** padrão `therapist` (`public.user_roles`, separada do profile por segurança).
3. Um **workspace pessoal** (`public.workspaces`) com slug derivado do user-id.
4. Uma **membership** como `owner` desse workspace (`public.workspace_members`).
5. Uma **subscription** `trialing` de 14 dias (`public.subscriptions`).

Toda query passa por RLS scoped ao `workspace_id`. Não existe acesso cross-workspace, mesmo para admin global. Ver [`docs/security.md`](docs/security.md).

## Status — Semana 1 ✅

Concluído e validado:

- ✅ Autenticação email/senha + Google OAuth (via Lovable Cloud managed)
- ✅ Multi-tenancy real com workspaces + RLS em todas as tabelas
- ✅ Sistema de roles (global `app_role` + por workspace `workspace_role`)
- ✅ Audit log server-side (PII-safe, INSERT revogado do client)
- ✅ Onboarding `/welcome` + Dashboard + Settings (Profile/Workspace funcionais; Security/Billing como stubs honestos)
- ✅ Documentação técnica completa em `docs/`
- ✅ Arquitetura preparada para 4 planos sem refator futuro

Veja [`docs/smoke-test-s1.md`](docs/smoke-test-s1.md) para o roteiro de QA executado.

## Documentação

- [`docs/architecture.md`](docs/architecture.md) — visão geral + future plan architecture
- [`docs/security.md`](docs/security.md) — RLS, roles, encryption strategy
- [`docs/database-schema.md`](docs/database-schema.md) — tabelas, enums, triggers
- [`docs/roadmap.md`](docs/roadmap.md) — cronograma 6 semanas
- [`docs/brand.md`](docs/brand.md) — Brand Book v3
- [`docs/smoke-test-s1.md`](docs/smoke-test-s1.md) — roteiro de QA da S1
- [`docs/technical-debt.md`](docs/technical-debt.md) — dívidas técnicas conscientes

## Licença

Uso interno · Confidencial · © Leda Carolina Lopes

