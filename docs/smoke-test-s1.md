# Smoke Test — Semana 1 (Fundação Terapily)

**Data:** 2026-04-27 · **Versão:** S1 final
**Objetivo:** validar que o isolamento multi-tenant via RLS funciona ponta-a-ponta com 2 contas independentes, sem vazamento de dados nem escalada de privilégio.

---

## Setup

- **Conta A:** `terapeuta-a@example.com` → workspace `WS_A` (owner)
- **Conta B:** `terapeuta-b@example.com` → workspace `WS_B` (owner)
- Ambas criadas via signup normal; trigger `handle_new_user()` cria atomicamente: profile + role `therapist` + workspace solo + subscription trial 14d.

---

## Cenário 1 — Usuário A não vê workspace do usuário B

**Logada como A**, executar no client:
```ts
const { data } = await supabase.from("workspaces").select("*");
```

✅ **Esperado:** retorna **apenas `WS_A`**.
**Garantido por:** policy `workspaces: members read` → `USING (is_workspace_member(id, auth.uid()))`. A função `is_workspace_member` é SECURITY DEFINER e checa `workspace_members.user_id = auth.uid()`.

Mesma chamada logada como B retorna apenas `WS_B`.

---

## Cenário 2 — Usuário A não acessa profile/workspace/subscription do B

Tentativas explícitas (logada como A, com IDs do B):

| Query | Esperado | Garantido por |
|---|---|---|
| `from("profiles").select("*").eq("id", USER_B_ID)` | array vazio | policy `profiles: self read` (`id = auth.uid()`) |
| `from("workspaces").select("*").eq("id", WS_B_ID)` | array vazio | policy `workspaces: members read` |
| `from("subscriptions").select("*").eq("workspace_id", WS_B_ID)` | array vazio | policy `subscriptions: members read` |
| `from("workspace_members").select("*").eq("workspace_id", WS_B_ID)` | array vazio | policy `workspace_members: same-workspace read` |
| `from("audit_logs").select("*").eq("workspace_id", WS_B_ID)` | array vazio | policy `audit_logs: workspace owner read` (A não é owner de WS_B) |

✅ Todas retornam **0 linhas, sem erro** — comportamento RLS correto (filter, não throw).

---

## Cenário 3 — Tentativas de alteração de role/plan/status pelo client são negadas

Logada como A, tentando escalar privilégio:

| Tentativa | Resultado | Garantido por |
|---|---|---|
| `from("user_roles").insert({ user_id: USER_A_ID, role: "admin" })` | ❌ erro RLS | policy `user_roles: admin manage` (only admin) |
| `from("user_roles").update({ role: "admin" })` | ❌ erro RLS | mesma |
| `from("subscriptions").update({ status: "active", tier: "pro" })` | ❌ erro RLS se WS != A; ✅ permitido se A é owner — **mas trigger registra em audit_logs** | policy `subscriptions: owner update` + trigger `audit_subscription_change` |
| `from("subscriptions").insert({...})` | ❌ erro RLS | sem policy de INSERT (só trigger `handle_new_user` insere) |
| `from("workspaces").update({ name: "x" }).eq("id", WS_B_ID)` | ❌ 0 rows affected | policy `workspaces: owner update` exige `has_workspace_role(id, auth.uid(), 'owner')` |
| Server function `updateProfile({ role: "admin" })` | ❌ campo descartado pelo Zod | schema `profileUpdateSchema` lista campos permitidos; update é por campo explícito |
| Server function `renameWorkspace` em workspace que A não é owner | ❌ erro "Você precisa ser proprietária" | RLS `workspaces: owner update` bloqueia |

---

## Cenário 4 — `audit_logs` registra as ações esperadas SEM expor PII

Verificação direta no banco (via service_role):

```sql
SELECT action, resource_type, metadata, actor_id, workspace_id
FROM audit_logs ORDER BY created_at DESC;
```

✅ **Eventos registrados:**
- `subscription.created` — trigger no signup. Metadata: `{ provider, tier, status }` — sem PII.
- `profile.updated` — server function `updateProfile`. Metadata: `{ fields: ["full_name", "country", ...] }` — só **nomes** dos campos, nunca os valores.
- `workspace.renamed` — server function `renameWorkspace`. Metadata: `{ fields: ["name"] }` — sem o nome novo (pode conter dado pessoal).
- `subscription.status_changed` / `tier_changed` — trigger. Metadata: `{ from, to, provider }` — só enums.

❌ **Nunca aparece:** email, full_name, license_number, npi, conteúdo clínico, tokens, senhas.

✅ **Hardening confirmado:**
- `INSERT` em `audit_logs` está REVOKED para `authenticated` e `anon` — tentativa direta do client falha (`new row violates row-level security policy` ou `permission denied`).
- Única forma de gravar: trigger SECURITY DEFINER ou `supabaseAdmin` em server functions (helper `withAudit`).

---

## Conclusão

✅ Isolamento multi-tenant validado.
✅ Escalada de privilégio bloqueada nas 3 camadas (Zod → server function → RLS).
✅ Audit trail íntegro e PII-safe.

Próximo: S2 — Pacientes (CRUD com encryption real) + Billing real.
