# Semana 1 — Fundação Terapily (versão final, future-proof)

Objetivo: entregar a base segura, multi-tenant, visualmente alinhada ao brand book e arquiteturalmente preparada pra todas as features do roadmap de 6 semanas — sem refatoração estrutural futura, sem soluções fake, sem páginas inseguras.

---

## Regra de governança permanente (vale pra sempre)

**Antes de implementar qualquer feature futura, validar:**

1. Está no plano da semana atual? (se não → avisar Leda)
2. Quebra alguma tabela/policy/contrato existente? (se sim → discutir antes)
3. É frontend-only ou tem backend real? (frontend-only → reformular como stub honesto com badge "Em breve")
4. Tem RLS, validação Zod, audit log onde precisa? (se não → bloquear)
5. Encaixa em pasta `/features/X/` existente ou cria nova seguindo template?
6. Quando a feature seguinte do roadmap chegar, esta decisão atrapalha?

**Princípios não-negociáveis:**
- Nada de UI sem backend real (proibido mock no front)
- Nada de "quase funcionando" — ou é ponta-a-ponta ou é stub explícito
- Toda mutação: Zod → server function autenticada → RLS → audit log
- Autorização sempre no banco/server, nunca só no client
- Toda tabela nova: `id`, `workspace_id`, `created_at`, `updated_at`, `deleted_at?`, RLS habilitada, índice em workspace_id
- Server-only é server-only (`.server.ts` nunca em rotas)

---

## Decisões travadas (memória permanente)

### Marca e naming
- Nome único: **Terapily** (sem hífen, pronúncia teh-ra-PAI-li)
- Wordmark sempre minúsculo (`terapily`), capitalizado em prosa
- Domínio: terapily.com (Theratasks só como possível 301 redirect pós-launch)
- Slogan: "Onde começa uma terapia melhor."
- Voz: autoridade calma, microcopy mínimo. Falar com pessoas, nunca "usuários"

### Visual (brand book v3)
- Paleta: Sage `#7E9B86` · Navy `#1F2A36` · Cream `#F4EFE6` · Mauve `#B89BA3` · Charcoal `#3A3F47`
- Preto puro `#000` proibido (usar Navy)
- Mauve só decorativo (≤8%, nunca em corpo); Sage e Mauve nunca lado a lado
- Proporção 60% Cream / 30% Navy / 10% Sage ou Mauve
- Tipografia: Cormorant (display) + Inter (UI). Body 1.5×, Display 1.05×. Eyebrow ALL CAPS tracked +120

### Arquitetura e segurança
- Multi-tenant (workspaces) desde dia 1
- Roles em tabela separada (`user_roles`) com `has_role()` SECURITY DEFINER, enum `app_role` com `therapist` e `admin`
- `audit_logs` com INSERT REVOKED — só via trigger SECURITY DEFINER ou server function
- `profiles.id = auth.users.id` (1:1, ON DELETE CASCADE)
- Campos `country`, `license_number`, `npi` opcionais
- `/settings/security` como stub (MFA real → S5)
- Soft delete (`deleted_at`) em todas as tabelas de domínio
- Encryption stub na S1 (interface pronta, implementação na S2)
- Feature flags por workspace desde dia 1
- Tabela `workspace_invitations` criada vazia (UI fica pra M3+)

---

## Estrutura de pastas (GitHub-ready, future-proof)

```text
src/
  routes/
    __root.tsx
    index.tsx                       # Landing pública
    auth.login.tsx
    auth.signup.tsx
    auth.callback.tsx
    auth.reset-password.tsx
    _authenticated.tsx              # Layout guard (redireciona pra /auth/login)
    _authenticated.welcome.tsx      # Onboarding
    _authenticated.dashboard.tsx
    _authenticated.settings.tsx
    _authenticated.settings.profile.tsx
    _authenticated.settings.workspace.tsx
    _authenticated.settings.security.tsx   # STUB
    _authenticated.settings.billing.tsx    # STUB

  features/
    auth/                           # components, hooks, services, types
    workspace/
    subscription/
    feature-flags/                  # useFeatureFlag hook + types
    audit/
      audit.server.ts               # SERVER-ONLY
    games/
      _core/                        # GameShell, useGameSession, ShareableLink, types, README

  components/
    ui/                             # shadcn customizado (Sage/Navy/Cream)
    brand/                          # Logo, Eyebrow, PullQuote
    layout/                         # AppShell, Sidebar, Header
    feedback/                       # ErrorBoundary, EmptyState, Spinner

  integrations/
    supabase/
      client.ts                     # Browser (anon)
      client.server.ts              # Server (service_role) — server-only
      auth-middleware.ts            # requireSupabaseAuth
      types.ts

  lib/
    crypto/
      encryption.ts                 # encryptPHI/decryptPHI (passthrough na S1, AES-GCM na S2)
    validation/                     # Zod schemas compartilhados
    constants.ts
    utils.ts

  hooks/
  styles.css                        # Tailwind v4 + tokens Terapily
  router.tsx

docs/
  brand.md
  database-schema.md
  rls-policies.md
  auth-flow.md
  decisions/                        # ADRs
```

---

## Cronograma (5 dias úteis)

### Segunda — Infraestrutura, naming, fundação visual
- Configurar Lovable Cloud
- Limpar template, ajustar `__root.tsx`
- Carregar Cormorant + Inter (preload, display swap)
- `styles.css` com tokens semânticos do brand book (cores hex, escala tipográfica, line-heights, eyebrow)
- Customizar variantes shadcn (Button, Card, Input, Badge) pra paleta Terapily
- Componentes `<Logo />`, `<Eyebrow />`, `<EmptyState />` em `components/brand/` e `components/feedback/`
- README profissional + `docs/brand.md`
- **Salvar memórias permanentes do projeto** (regra future-proof, brand, roadmap, out-of-scope)

### Terça — Migrations + RLS (sem UI)
- Migration 001: enum `app_role` (therapist, admin)
- Migration 002: `profiles` (id = auth.users.id, full_name, country?, license_number?, npi?, avatar_url?, locale, timezone, mfa_enabled default false, deleted_at?). COMMENT documentando 1:1 com auth.users
- Migration 003: `user_roles` + `has_role(uuid, app_role)` SECURITY DEFINER
- Migration 004: `workspaces` + `workspace_members` + `is_workspace_member(uuid, uuid)` SECURITY DEFINER. Ambas com `deleted_at?`
- Migration 005: `subscriptions` (workspace_id, status, trial_ends_at, plan, lemonsqueezy_customer_id?, lemonsqueezy_subscription_id?). Campos LemonSqueezy criados nullable, populados na S2
- Migration 006: `audit_logs` + `REVOKE INSERT FROM authenticated, anon`
- Migration 007: `workspace_invitations` (id, workspace_id, email, invited_by, role, token, expires_at, accepted_at, created_at) + RLS. Vazia na S1, UI em M3+
- Migration 008: `feature_flags` (workspace_id, flag_name, enabled, created_at) + função `has_feature(workspace_id, text)` SECURITY DEFINER
- Migration 009: trigger `handle_new_user()` SECURITY DEFINER (cria profile + role therapist + workspace solo + subscription trial 14d + audit log "user_created" — atômico)
- RLS policies em todas as tabelas usando `is_workspace_member()` e `has_role()`, todas filtrando `deleted_at IS NULL`
- `lib/crypto/encryption.ts` com `encryptPHI()`/`decryptPHI()` passthrough + TODO S2

### Quarta — Auth ponta-a-ponta com identidade visual
- `auth.login.tsx` e `auth.signup.tsx` (Cormorant nas manchetes, Inter no formulário, Cream de fundo)
- Microcopy: "Bem-vinda de volta." / "Pronto. Vamos começar." / "Salvo."
- `auth.callback.tsx` (confirmação de e-mail)
- `auth.reset-password.tsx` (com `/reset-password` como rota pública)
- `_authenticated.tsx` com `beforeLoad` redirect pra `/auth/login`
- Hook `useAuth` + provider integrado ao router context
- Cliente Supabase browser + auth-middleware
- Validação Zod em todos os formulários
- Teste manual: signup → e-mail confirm → login → workspace solo criada com trial

### Quinta — Onboarding + Dashboard
- `/welcome` — formulário de perfil (full_name obrigatório; country/license/npi opcionais com label "Recomendado para perfil completo")
- Server function `updateProfile` com Zod + `requireSupabaseAuth` + audit log
- `/dashboard` — saudação editorial, eyebrow "PAINEL", card de status do trial com countdown, EmptyStates honestos das próximas seções (Pacientes/Tarefas/Jogos com badge "Em breve · Semana X")
- `_authenticated.tsx` — sidebar Navy sobre Cream, header com avatar e WorkspaceSwitcher (read-only)
- Landing `index.tsx` com slogan "Onde começa uma terapia melhor." em Cormorant 56pt
- Hook `useFeatureFlag(name)` consumindo `feature_flags` (sempre false na S1, mas API pronta)

### Sexta — Audit, Settings stub, qualidade, docs
- `audit.server.ts` com `createServerFn` + `supabaseAdmin` + helper `withAudit(action, fn)` que envolve qualquer server function
- Trigger de audit em `subscriptions` (mudança de status)
- `/settings/profile` — editar full_name, avatar, locale, timezone, campos opcionais (server function + audit)
- `/settings/workspace` — renomear workspace, ver membros (read-only, server function + audit)
- `/settings/security` — STUB: toggle MFA disabled + badge "Em breve · Semana 5", delete account disabled
- `/settings/billing` — STUB: card "Trial ativo, X dias restantes" + "Ver planos" disabled
- ErrorBoundary global + 404 customizado com voz Terapily
- Sentry configurado (server + client)
- Documentação completa: `docs/brand.md`, `docs/database-schema.md`, `docs/rls-policies.md`, `docs/auth-flow.md`, `docs/decisions/`
- Smoke test ponta-a-ponta com 2 contas (verificar isolamento RLS)
- **Security scan** rodado e findings revisados

---

## Critérios de sucesso

- [ ] Signup cria atomicamente: profile + role + workspace + subscription trial + audit log
- [ ] RLS impede usuário A de ler dados de usuário B (testado com 2 contas)
- [ ] `audit_logs` rejeita INSERT direto do client (testado via SQL)
- [ ] Trial de 14 dias visível com countdown
- [ ] `lib/crypto/encryption.ts` exporta interface final (passthrough OK)
- [ ] `feature_flags` + `has_feature()` operacionais (sem UI)
- [ ] `workspace_invitations` existe vazia com RLS pronta
- [ ] `deleted_at` presente em todas as tabelas de domínio + RLS filtra
- [ ] Cores aplicadas seguem proporção 60/30/10
- [ ] Cormorant nas manchetes, Inter no resto
- [ ] Microcopy em PT-BR seguindo a voz (sem "usuário", sem jargão)
- [ ] Zero referência a "Sessio" ou `#000` puro
- [ ] Stubs `/settings/security` e `/settings/billing` claros sem quebrar
- [ ] Security scan sem findings de severidade error
- [ ] README + docs completos
- [ ] Build de produção passa sem erros TypeScript

---

## O que NÃO entra na Semana 1

| Feature | Quando entra | Por quê |
|---|---|---|
| Tabelas de jogos (sessions/results/events) | S3 | Só faz sentido depois do tabuleiro |
| Magic link de jogos pra paciente | S3-S4 | Depende das tabelas |
| MFA real (TOTP, recovery codes) | S5 | 1,5 dia, exige re-auth |
| Delete account | S5 | Cascata + grace period + export |
| LemonSqueezy / billing real | S2 | Webhook + portal |
| Encryption AES-GCM-256 implementação | S2 | Interface pronta na S1 |
| Multi-workspace por terapeuta na UI | M3+ | Schema suporta, UI fica solo |
| Convite de membros (UI) | M3+ | Tabela criada na S1, fluxo depois |
| Resend / e-mails customizados | S2 | Default Supabase basta |
| PostHog | S2 | Não bloqueia auth |
| Modo escuro completo | S4 | Tokens prontos, só light na S1 |
| SVG final do logo | Quando Leda enviar | Wordmark Cormorant é placeholder |
| Pacientes (CRUD) | S2 | Primeira feature de domínio |
| Tarefas / homework | S3 | Depois de pacientes |
| Notas de sessão | S4 | Depois de tarefas |
| Agenda / calendário | S5 | Última feature antes do polimento |

Lembrete pra você, Leda: se durante a semana você pedir qualquer coisa dessa lista, eu vou avisar **"Leda, isso atrasaria a S1 por X dias, vamos manter pra Semana Y?"**

---

## Detalhes técnicos

- **Stack:** React 19 + TanStack Start (file-based routing) + Tailwind v4 + shadcn/ui + Supabase (Lovable Cloud) + TanStack Query
- **Tokens Tailwind v4 (`styles.css`):** `--color-sage`, `--color-navy`, `--color-cream`, `--color-mauve`, `--color-charcoal` + variantes (50…900) via `@theme`
- **Fontes:** Google Fonts com preload, `font-display: swap`, fallback `serif`/`sans-serif`
- **Auth guard:** layout pathless `_authenticated.tsx` com `beforeLoad` + `redirect()`
- **Multi-tenant RLS:** toda tabela sensível tem `workspace_id` + `USING (is_workspace_member(auth.uid(), workspace_id) AND deleted_at IS NULL)`
- **Audit hardening:** REVOKE INSERT + triggers SECURITY DEFINER + server functions com service_role + helper `withAudit()`
- **Trigger atômico:** `handle_new_user()` em `auth.users` AFTER INSERT roda toda a cadeia numa transação
- **Encryption stub:** `encryptPHI(text): Promise<string>` retorna o input na S1, AES-GCM-256 com chave em env var na S2
- **Feature flags:** `has_feature(workspace_id, flag_name)` SECURITY DEFINER + hook `useFeatureFlag()` no client
- **TanStack Start:** loaders rodam client+server (cuidado com `window`); QueryClient dentro de `getRouter()` (nunca singleton); `<HeadContent />` com title "Terapily · Onde começa uma terapia melhor."
- **Server functions:** padrão único `.inputValidator(zod).handler()` com `requireSupabaseAuth` middleware
