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

- **S1 (atual):** RLS + audit + roles + soft delete.
- **S2:** AES-GCM real + webhook signing (LemonSqueezy).
- **S5:** MFA real (TOTP), delete account com export.
