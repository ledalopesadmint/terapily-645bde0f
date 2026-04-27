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

## Roadmap (6 semanas)

- **S1** — Fundação: auth, workspaces, RLS, audit, brand visual
- **S2** — Pacientes (CRUD) + billing real + encryption AES-GCM-256
- **S3** — Tarefas (homework) + estrutura de jogos + Anatomia da Ansiedade
- **S4** — Notas de sessão + modo escuro
- **S5** — Agenda + MFA real + delete account
- **S6** — Polimento + launch

## Desenvolvimento

```bash
npm install
npm run dev
```

## Licença

Uso interno · Confidencial · © Leda Carolina Lopes
