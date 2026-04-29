# Terapily — Security Posture

Este documento consolida a postura de segurança do projeto. Em caso de
conflito com código, **este documento vence** — o código é ajustado.

---

## 1. Modelo de acesso

- **Multi-tenant via `workspaces` + `workspace_members`** desde o dia 1.
- Toda tabela com dado sensível tem `workspace_id` + RLS ativa via
  `is_workspace_member(workspace_id, auth.uid())` + filtro `deleted_at IS NULL`.
- Roles em **tabela separada** (`user_roles`) com função `has_role()`
  `SECURITY DEFINER`. NUNCA armazenar role em `profiles` ou tabelas de usuário.
- **Admin é exclusivo da Leda** (`admin@terapily.com`). Banco bloqueia 2º
  admin via índice único parcial. Nunca propor UI de gestão de admins nem
  promover outro usuário.
- Workspace roles: `owner` (vê tudo do workspace) e `therapist` (vê só
  pacientes que estão atribuídos a ele).
- Paciente **NUNCA cria conta**, nunca tem sessão. Único acesso é via magic
  link single-use (ver `magic-link-rules-locked.md`).

---

## 2. Autenticação

- Supabase Auth com email/senha + Google OAuth.
- Email signup confirmado por padrão (não auto-confirmar).
- MFA (TOTP) planejado pra S5 — gating obrigatório no Practice, opt-in no
  Basic. Tabelas: `workspace_security_policy`, `user_recovery_codes` (hash).
- Não há "anonymous sign-up". Paciente nunca cria conta — único acesso é
  magic link.
- Service role (`SUPABASE_SERVICE_ROLE_KEY`) é server-only. Nunca importado
  em código que possa ir pro client. Usado só em server functions/routes
  trusted (webhooks Stripe, server functions públicas do magic link, jobs
  de purge).

---

## 3. PHI (Protected Health Information)

PHI inclui: nome, email, telefone, conteúdo de respostas clínicas,
vinculação paciente↔diagnóstico.

### Cifragem at-rest

- Algoritmo: **AES-256-GCM** com `PHI_ENCRYPTION_KEY` (server secret).
- IV único por payload, formato versionado (`v1:iv:ciphertext`).
- Aplicado em:
  - `patients.full_name_encrypted` / `email_encrypted` / `phone_encrypted`
  - `activity_responses.raw_responses_encrypted`
  - `activity_drafts.draft_encrypted`
- **Nunca** logar payload claro. **Nunca** retornar payload em mensagem de
  erro.

### Onde PHI **NUNCA** pode aparecer

- URLs (incluindo redirects, magic links, OAuth callbacks)
- Subject ou body de email transacional
- Push notifications
- Logs de erro (Sentry, console, server logs)
- PostHog ou qualquer analytics
- `audit_logs.metadata` (só UUIDs e enums permitidos)
- Mensagens de erro retornadas ao client
- URL params, query strings, fragmentos

### Reveal on-demand

Email/telefone do paciente só aparecem quando o terapeuta clica explicitamente
em "Revelar". Cada reveal gera audit log `patient.contact_revealed` (sem PHI
no metadata, só `patient_id` + campo).

---

## 4. Audit logs (`audit_logs`)

- INSERT **REVOKED** do client. Só via:
  - trigger `SECURITY DEFINER` (`audit_*_change`)
  - server function chamando `supabaseAdmin`
- SELECT permitido pra:
  - admin (todos os logs)
  - owner do workspace (logs do próprio workspace)
- `metadata` JSONB **NUNCA** contém PHI. Permitidos: UUIDs (patient_id,
  patient_activity_id, etc.), enums (status, severity), inteiros
  (`completion_percent`), timestamps.
- Hash chain dos logs planejada pra S5/S6 (não está em S3).

---

## 5. Magic link (resumo)

Detalhes completos em `magic-link-rules-locked.md`.

- Token cru gerado com `crypto.randomBytes(32)` → base64url. Mostrado **1x**
  e nunca persistido.
- Banco guarda só `sha256(token)` em `token_hash` (UNIQUE).
- Single-use após submit (`used_at` + `token_hash` zerado).
- Mensagem neutra fixa pra qualquer falha (expirado/usado/revogado/
  inexistente). Anti-enumeração.
- Rate limit: 10 req/min por IP + 5 req/min por token.
- **EXPIRA O ACESSO → NÃO EXPIRA O DADO**: token expira, dados (`patient_activities`,
  `activity_responses`) permanecem permanentes.

---

## 6. Soft delete e retenção

- Pacientes **nunca** são deletados via `DELETE FROM patients` em código.
- Soft delete (`deleted_at`) + janela de 30 dias restaurável + purge
  irreversível de PHI após 30d (mantém audit). Função:
  `purge_expired_patients()` rodada via cron com `PURGE_HOOK_SECRET`.
- Aba `/patients/deleted` obrigatória pra restaurar dentro da janela.
- Auto-purge de respostas só ocorre via política de retenção configurável
  (piso HIPAA 6 anos), nunca por expiração de magic link.

---

## 7. Server-side architecture

- TanStack Start `createServerFn` é o padrão pra lógica server-side
  autenticada. NUNCA usar Supabase Edge Functions como camada padrão.
- Webhooks externos (Stripe, etc.) ficam em `src/routes/api/public/*` com
  verificação de assinatura HMAC obrigatória **antes** de processar
  qualquer payload.
- Loaders são isomórficos. Queries Supabase com service role ou secrets
  ficam **dentro** de server functions, nunca no loader direto.
- Três clientes Supabase com fronteiras claras:
  - `client.ts` — browser, publishable key, RLS aplicada
  - `auth-middleware.ts` — server, atua como user signed-in, RLS aplicada
  - `client.server.ts` — server-only, service role, **bypassa RLS**

---

## 8. Subprocessadores e BAA

PHI em trânsito ou em repouso só pode passar por subprocessador com BAA
assinado:

- **Lovable Cloud (Supabase)** — BAA via plano apropriado
- **Resend** — BAA pendente. Enquanto não assinado, envio automático de email
  está desligado por feature flag (`RESEND_BAA_SIGNED`). Server retorna o link
  pro terapeuta copiar manualmente; audit registra
  `activity.email_skipped_no_baa`.
- **Stripe** — BYOK na conta da Leda. Stripe nunca recebe PHI; só assinatura,
  tier e metadados não-clínicos.
- **PostHog** — não recebe PHI. Não carrega em rotas públicas (`/p/:token`).

---

## 9. Rate limiting

- A plataforma não tem primitivas distribuídas maduras de rate limit.
- Implementação atual (S3): em memória do worker, por IP + por token hash.
- Rotas com rate limit obrigatório:
  - `/p/:token` (resolve, submit) — 10/min IP, 5/min token
  - Endpoints de draft (`saveActivityDraft`, `getActivityDraft`,
    `discardActivityDraft`) — mesma regra
- Migração pra solução distribuída (Durable Object ou tabela
  `rate_limit_buckets`) planejada pra S5/S6 se houver evidência de abuso.
- Nunca aceitar fallback inseguro: rate limit impossível de implementar →
  bloquear deploy.

---

## 10. Validação de input

- Toda server function pública usa **Zod** com:
  - `min`/`max` em strings, números e arrays
  - regex em strings com formato conhecido
  - whitelist de enums
- Token validado por `min(16).max(256)` antes de qualquer hash.
- Nunca confiar em `workspace_id` / `patient_id` vindo do client em rotas
  públicas — server resolve sempre via token.

---

## 11. O que NUNCA pode acontecer

- Cliente sem sessão acessar PHI fora do magic link single-use.
- Token cru aparecer em qualquer log, banco, email, audit ou response.
- PHI aparecer em URL, email subject/body, push, audit metadata, erro,
  PostHog ou qualquer log.
- Cross-tenant read/write (terapeuta de workspace A vê paciente de
  workspace B).
- Service role usado em código que pode ir pro client bundle.
- DELETE direto em `patients` (sempre soft + janela + purge).
- Promoção de outro usuário a admin.
- Envio de email automático com PHI sem BAA assinado.

---

## 12. Riscos aceitos hoje

- **Rate limit em memória do worker** (não distribuído). Mitigação: link é
  single-use, abuso sustentado custa caro pro atacante. Migração planejada
  pra S5/S6.
- **Email transacional desligado** até BAA com Resend. Workaround: terapeuta
  copia o link manualmente. Trade-off aceito pra não vazar PHI antes do BAA.
- **MFA não obrigatório** até S5. Risco aceito por estar em fase pré-launch
  (sem usuários reais antes do fim de S6).

---

## Referências cruzadas

- `docs/magic-link-rules-locked.md` — regras travadas do magic link
- `docs/autosave-security.md` — regras do `activity_drafts`
- `docs/s3-definition-of-done.md` — checklist de S3
- `mem://features/patient-deletion-policy` — política de exclusão
- `mem://features/storage-economics` — política de retenção
- `mem://constraint/single-admin` — admin único
