# Terapily — Segurança

## Princípios

1. **Backend é a única fonte de verdade.** Frontend só reflete permissões.
2. **RLS sempre habilitada** em todas as tabelas com dados de usuário.
3. **Roles separados:** `user_roles` (global) ≠ `workspace_members.role` (escopo de workspace). Nunca misturar.
4. **PII nunca aparece em audit logs** — apenas nomes de campos e enums.
5. **`audit_logs` é append-only** — INSERT direto pelo cliente é revogado, só o `supabaseAdmin` (service role via `withAudit()`) escreve.

## Roles

### Globais (`user_roles` + enum `app_role`)

| Role | Quem | Para quê |
|---|---|---|
| `admin` | Equipe Terapily | Suporte, leitura global de auditoria |
| `therapist` | Padrão para todo signup atual | Acesso ao app clínico |
| `patient` | **futuro (Patient B2C)** | Acesso à área do paciente |

### Por workspace (`workspace_members.role` + enum `workspace_role`)

| Role | Para quê |
|---|---|
| `owner` | Dono do consultório/clínica. Gerencia membros, billing, settings. |
| `therapist` | Membro clínico. Vê apenas seus próprios pacientes/dados. |
| `supervisor` | **futuro (Clinic)**. Regras de supervisão a definir. |

**Nunca** colocar `owner` ou `supervisor` em `user_roles` — são exclusivamente de workspace.

## RLS — funções de apoio (SECURITY DEFINER)

São intencionalmente `SECURITY DEFINER` para evitar recursão de RLS — padrão recomendado pela Supabase.

- `has_role(user_id, role)` — checa role global.
- `is_workspace_member(workspace_id, user_id)` — membro ativo (deleted_at IS NULL).
- `has_workspace_role(workspace_id, user_id, role)` — role específico no workspace.
- `has_feature(workspace_id, flag)` — feature flag por workspace.

## Limites por plano — regra dura

A coluna `subscriptions.limits jsonb` é **apenas declarativa** (referência para UI e billing).

**Toda regra crítica precisa ser validada no backend/RLS:**

- `max_therapists` → checar em server function antes de aceitar convite.
- `max_patients` → checar em server function antes de criar paciente.
- Acesso a recursos premium → checar via `has_feature()` ou query direta em `subscriptions.tier`.

Nunca confiar no frontend lendo `limits`. Frontend pode usar para mostrar/esconder UI, mas a recusa real vem do backend.

## Audit

- Tabela `audit_logs`: append-only, INSERT do cliente revogado.
- `withAudit(action, fn)` envolve server functions e registra ação + ator + workspace + metadata sanitizada.
- Trigger `audit_subscription_change` registra mudanças de `status` e `tier` automaticamente.
- **Metadata sanitizada:** apenas nomes de campos alterados, valores de enum, IDs. **Nunca** valores de PII (nome, email, número de licença, conteúdo clínico).

## Encryption

- PHI (notas clínicas, observações de paciente) será criptografada com AES-GCM-256 via helper `encryptPHI()` na S2.
- Chave gerenciada via secret no backend, nunca exposta ao cliente.

## Roadmap de segurança

- **S1 (atual):** RLS + audit + roles + soft delete + HIBP password check.
- **S2:** AES-GCM real + webhook signing (Stripe/LemonSqueezy).
- **S5:** MFA TOTP (ver abaixo), session timeout configurável, hash chain de audit_logs.
- **S6:** IP allowlist (Practice), delete account com export pré-purge.

## MFA (Multi-Factor Authentication) — planejado para S5

### Promessa de plano

- **Basic ($69):** MFA opcional (cada terapeuta pode habilitar).
- **Practice ($159):** MFA **obrigatório** para todos os membros do workspace, com período de graça configurável (padrão 7 dias após convite aceito).
- Justificativa HIPAA: §164.312(d) *Person or Entity Authentication* — recomenda autenticação multifator para acesso a ePHI.

### Stack escolhida

Lovable Cloud (Supabase Auth) provê MFA TOTP nativo, sem custo extra:

- `supabase.auth.mfa.enroll({ factorType: 'totp' })` → retorna QR code (otpauth URL) + secret.
- `supabase.auth.mfa.challenge({ factorId })` → cria challenge.
- `supabase.auth.mfa.verify({ factorId, challengeId, code })` → valida código de 6 dígitos.
- `supabase.auth.mfa.unenroll({ factorId })` → remove fator.

Sessões ganham um nível de garantia (AAL):
- **AAL1** = senha apenas
- **AAL2** = senha + TOTP

### Tabelas a criar (S5)

```sql
-- Política de MFA por workspace
create table public.workspace_security_policy (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  require_mfa boolean not null default false,
  mfa_grace_period_days int not null default 7,
  session_timeout_minutes int not null default 60,
  ip_allowlist inet[] default null,  -- S6
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Recovery codes (hash, nunca plaintext)
create table public.user_recovery_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
```

Helper SECURITY DEFINER:

```sql
create function public.requires_mfa(_workspace_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select require_mfa from workspace_security_policy where workspace_id = _workspace_id),
    -- fallback: Practice tier sempre exige
    (select tier = 'practice' from subscriptions where workspace_id = _workspace_id)
  );
$$;
```

### Middleware AAL2

Server function middleware que rejeita ações sensíveis se a sessão for AAL1:

- Export de relatório clínico (PDF)
- Acesso à página de audit logs
- Mudança de billing
- Convite de membros
- Mudança de policy de segurança

```typescript
// src/integrations/supabase/aal2-middleware.ts (S5)
export const requireAAL2 = createMiddleware().server(async ({ next, context }) => {
  const aal = context.claims?.aal ?? 'aal1';
  if (aal !== 'aal2') {
    throw new Error('MFA_REQUIRED');
  }
  return next();
});
```

### UI flow (S5)

1. **`/settings/security/mfa`** — enroll: QR code → input código → mostra 10 recovery codes (1x apenas, com botão "baixei e guardei").
2. **Login** — após senha, se user tem fator ativo → step 2 com input de 6 dígitos. Botão "Use recovery code" como fallback.
3. **Owner do workspace Practice** — toggle "Require MFA for all members" + dias de graça.

### Audit events (S5)

`mfa.enrolled`, `mfa.verified`, `mfa.disabled`, `mfa.challenge_failed`, `mfa.recovery_used`, `mfa.policy_changed`.

### Por que NÃO agora (S1)

- Sem billing ainda → não dá pra gating por plano corretamente.
- Sem flow de recovery codes desenhado → risco de criar tabela errada e refazer migration.
- Google OAuth (já ativo) é 2FA implícito se a conta Google tem 2FA — cobre cético inicial.
- Promessa só será visível no launch (pós-S6); nada quebra prometendo agora e entregando S5.
