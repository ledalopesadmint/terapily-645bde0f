# Activity Drafts (Autosave) — Security Rules

**Aprovado pela Leda em 2026-04-29**, desviando da decisão original da Etapa 2
(que era NÃO ter autosave em S3). Decisão registrada com aprovação explícita.

Espelha `mem://features/activity-drafts-s3` e é tratado como **extensão
crítica de PHI** — mesma disciplina de `activity_responses`.

---

## 0. Classificação

- Autosave = **armazenamento de PHI parcial**.
- Mesmo nível de proteção da resposta final.
- Mesmo padrão de cifragem.
- Mesma disciplina de auditoria.

---

## 1. Por que existe

Paciente preenche escala (PHQ-9, GAD-7, etc.) via magic link sem login. Se
fechar a aba ou perder conexão antes de submeter, perderia tudo. Autosave
server-side resolve sem usar storage do browser.

---

## 2. Princípios obrigatórios

- Draft **nunca** é resposta final.
- Draft **nunca** gera score.
- Draft **nunca** entra em relatório / Compliance Report.
- Draft **nunca** aparece como dado clínico consolidado.
- Draft **sempre** criptografado (AES-256-GCM).
- Draft **nunca** armazenado em texto puro.
- Draft **nunca** armazenado no browser (proibido `localStorage`,
  `sessionStorage`, `IndexedDB`, cookies).
- Draft **expira junto com o token**.
- Draft é apagado imediatamente após submit final.

**REGRA CENTRAL:**

> EXPIRA O ACESSO + DRAFT
> NÃO EXPIRA A RESPOSTA FINAL

---

## 3. Schema

```sql
CREATE TABLE public.activity_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_activity_id uuid NOT NULL UNIQUE,  -- 1 draft por atividade
  workspace_id uuid NOT NULL,                -- denormalizado p/ RLS
  patient_id uuid NOT NULL,                  -- denormalizado
  draft_encrypted text NOT NULL,             -- AES-256-GCM, formato v1:iv:ciphertext
  completion_percent integer NOT NULL DEFAULT 0
    CHECK (completion_percent BETWEEN 0 AND 100),
  expires_at timestamptz NOT NULL,           -- = patient_activities.token_expires_at
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

Regras do schema:
- FK obrigatória pra `patient_activities` (via UNIQUE em `patient_activity_id`).
- `workspace_id` e `patient_id` derivados da `patient_activity` no servidor.
  **NUNCA** aceitar esses campos vindos do client.
- `draft_encrypted` usando AES-256-GCM com `PHI_ENCRYPTION_KEY`.
- Nunca armazenar payload descriptografado.

### RLS

- SELECT: só pra owner do workspace ou terapeuta atribuído ao paciente
  (debug/troubleshooting).
- INSERT/UPDATE/DELETE **REVOKED do client**. Só via `supabaseAdmin` nas
  server functions públicas.

---

## 4. Cifragem

- Mesma `PHI_ENCRYPTION_KEY` usada em `activity_responses`.
- AES-256-GCM, IV único por salvamento (gerado com `crypto.randomBytes`).
- Payload versionado: `v1:base64(iv):base64(ciphertext)`.

**PROIBIDO:**
- Reutilizar IV.
- Logar payload claro.
- Retornar payload em mensagem de erro.

---

## 5. Server functions (públicas, sem auth)

### `saveActivityDraft({ token, draft, completionPercent })`
- Valida hash do token.
- Bloqueia se expirado / usado / revogado / inválido (mensagem neutra).
- Cifra `draft`.
- Upsert por `patient_activity_id` (UNIQUE).
- Calcula `completion_percent`.
- Audit: `activity.draft_saved` (sem PHI).

### `getActivityDraft({ token })`
- Valida hash do token.
- Decifra draft.
- Retorna **somente** pro mesmo token (escopo de leitura = escopo do link).
- Audit: `activity.draft_loaded`.

### `discardActivityDraft({ token })`
- Valida hash do token.
- Apaga draft.
- Audit: `activity.draft_discarded`.

---

## 6. Rate limit (obrigatório)

- 10 req/min por IP.
- 5 req/min por token (hash).
- Aplicado em **todos** os endpoints de draft.
- Mensagem neutra ao bloquear.
- Se a implementação não for possível: **bloquear deploy**. Sem fallback
  inseguro.

---

## 7. Expiração e purge

- `expires_at` do draft = `token_expires_at` do `patient_activities`.
- Draft não pode ser acessado após expiração.
- Draft é purgado automaticamente:
  - **após submit final** (na mesma server function que cria
    `activity_responses`)
  - **após expiração** (job de purge ou retry de purge)

Garantir:
- Nenhuma referência residual.
- Nenhum dado parcial além do prazo.

---

## 8. UX segura

Na rota `/p/:token`:

- Autosave silencioso, **debounce 2-3s**.
- Indicador discreto: **"Progresso salvo"** (com `aria-live="polite"`).
- Banner de tranquilização: **"Você pode começar agora e terminar depois.
  Seu progresso será salvo com segurança."**

Ao reabrir o link com draft existente, modal:

> **"Encontramos um progresso salvo"**
> Você havia respondido X% desta atividade. Deseja continuar de onde parou?
>
> [Recomeçar]   [Continuar]

`Recomeçar` chama `discardActivityDraft` antes de zerar o estado local.

---

## 9. Submissão final

Ao enviar:
1. Salvar resposta final cifrada em `activity_responses`.
2. Calcular score.
3. Marcar `used_at` + `status = completed` + zerar `token_hash`.
4. **Apagar draft imediatamente.**

Garantir:
- Não existir draft após submit (verificar com SELECT pós-submit).
- Resposta final independe do draft (a `activity_responses` carrega tudo).

---

## 10. Auditoria (sem PHI)

Eventos registrados:
- `activity.draft_saved`
- `activity.draft_loaded`
- `activity.draft_discarded`
- `activity.submitted` (cobre o purge implícito)

Metadata permitida:
- `patient_id` (UUID)
- `patient_activity_id` (UUID)
- `activity_id` (UUID)
- `workspace_id` (UUID)
- `completion_percent` (integer)

**PROIBIDO em audit metadata:**
- Respostas
- Texto digitado
- Nome / email / telefone do paciente
- Token cru ou hash

---

## 11. Segurança global

Garantir:
- Nenhum PHI em logs.
- Nenhum PHI em URL.
- Nenhum PHI em email.
- Nenhum PHI em audit metadata.
- `encryption.server.ts` nunca vai para o client (Vite import protection
  bloqueia via convenção `*.server.ts`).
- Token nunca aparece em logs (nem cru nem hash).

---

## 12. Fail-safe

Se qualquer uma das condições abaixo ocorrer:
- Falha de cifragem
- Falha de validação de token
- Falha de rate limit
- Conteúdo do draft corrompido / chave inválida

→ **NÃO salvar draft**
→ **NÃO continuar operação**
→ Retornar erro neutro `PublicLinkError`
→ Logar só código sanitizado (sem token, sem PHI)

---

## 13. Out of scope

- Autosave client-side criptografado (rejeitado por proibir storage no
  browser).
- Compartilhar draft entre dispositivos via login (paciente nunca tem
  conta).
- Histórico de versões do draft (só o último estado).
- Recuperação de draft após submit final (purge é definitivo).

---

## 14. Checklist de validação manual (blocker)

1. Paciente começa atividade.
2. Responde parcialmente.
3. Sai da página.
4. Volta pelo link.
5. Modal "Encontramos um progresso salvo" aparece.
6. Continua do ponto salvo.
7. Envia resposta final.
8. Draft é apagado (verificar com SELECT no banco).
9. Link não funciona após uso (mensagem neutra).
10. Resposta aparece no paciente correto.
11. Histórico permanece após expiração do token.

---

## Referências cruzadas

- `docs/magic-link-rules-locked.md` — regras travadas do magic link
- `docs/security.md` — postura de segurança consolidada
- `docs/s3-definition-of-done.md` — checklist de S3
- Implementação:
  - `src/server/activity-drafts.functions.ts`
  - `src/server/public-activities.functions.ts` (purge no submit)
  - `src/lib/rate-limit/public-link.server.ts`
  - `src/lib/crypto/encryption.server.ts`
  - `src/routes/p.$token.tsx` (UI)
