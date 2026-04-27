# Terapily — Database Schema

Todas as tabelas têm RLS habilitada. Nenhuma tabela tem FK para `auth.users` (regra Lovable Cloud).

## Enums

### `app_role` (role global)
`admin` | `therapist` | `patient`

### `workspace_role` (role dentro de workspace)
`owner` | `therapist` | `supervisor`

### `subscription_tier`
`solo` (legado) | `basic` | `practice` | `clinic` | `patient`

### `subscription_status`
`trialing` | `active` | `past_due` | `canceled` | `incomplete` | `paused` | `expired`

### `invitation_status`
`pending` | `accepted` | `revoked` | `expired`

## Tabelas principais

### `profiles`
Dados pessoais do usuário (espelho de `auth.users`).
Campos: `full_name`, `avatar_url`, `country`, `license_number`, `npi`, `locale`, `timezone`.
Soft delete via `deleted_at`.

### `user_roles`
Roles globais. Apenas admin pode gerenciar; usuários veem só os seus.

### `workspaces`
Consultório, prática ou clínica. `slug` único, `trial_ends_at` default +14 dias.
Nunca um workspace por terapeuta de uma mesma clínica — sempre 1 workspace = 1 entidade clínica.

### `workspace_members`
Vínculo usuário ↔ workspace com role (`owner`/`therapist`/`supervisor`). Soft delete.

### `workspace_invitations`
Convites por e-mail com token, expiração 7 dias.

### `subscriptions`
Assinatura por workspace.
- `tier`: plano (basic/practice/clinic/patient).
- `status`: estado de cobrança.
- `limits jsonb`: limites declarativos do plano (`{"max_therapists": 2, ...}`). **Não usar para segurança real** — apenas referência.
- `trial_ends_at`: default +14 dias.

### `feature_flags`
Flags por workspace. Owner gerencia, membros leem.

### `audit_logs`
Append-only. Cliente não pode INSERT (revogado). Apenas service role escreve via `withAudit()`.

## Triggers

- `handle_new_user` (em `auth.users` AFTER INSERT): cria profile, user_role `therapist`, workspace solo, membership owner, subscription trialing.
- `audit_subscription_change` (em `subscriptions`): registra criação e mudanças de `status`/`tier`.
- `update_updated_at_column`: aplicado em tabelas com `updated_at`.

## Funções (SECURITY DEFINER por desenho)

- `has_role(user_id, role)` → boolean
- `is_workspace_member(workspace_id, user_id)` → boolean
- `has_workspace_role(workspace_id, user_id, role)` → boolean
- `has_feature(workspace_id, flag)` → boolean

São SECURITY DEFINER intencionalmente para evitar recursão de RLS. Não revogar.

## Suporte aos 4 planos

| Plano | Tabelas envolvidas | Implementado? |
|---|---|---|
| Basic | workspaces + 1 owner em workspace_members | ✅ |
| Practice | workspaces + até 2 em workspace_members (validar `limits.max_therapists` em server fn) | estrutura OK, validação em S2 |
| Clinic | mesma estrutura, até 10 + supervisor | estrutura OK, lógica em fase futura |
| Patient (B2C) | profiles + user_roles `patient`, **sem workspace** | requer ajuste futuro em `handle_new_user` + tabela `therapist_patient_links` |
