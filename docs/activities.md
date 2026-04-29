# Módulo Activities — Fluxo completo (S3)

Atividades terapêuticas (escalas como PHQ-9, GAD-7) prescritas pelo terapeuta
para o paciente, em 3 modos de uso. Inclui magic link sem login, autosave
seguro e auto-scoring.

> Regras travadas: ver `docs/magic-link-rules-locked.md` e
> `docs/autosave-security.md`. Em conflito, **as regras travadas prevalecem.**

---

## Localização

```
src/features/activities/
  activities.functions.ts        Server fns autenticadas do terapeuta
  activities.server.ts           Helpers server-only (lookup por hash, etc.)
  public-activities.functions.ts Server fns PÚBLICAS (sem auth) — paciente
  activity-drafts.functions.ts   Server fns PÚBLICAS de autosave
src/lib/
  scoring/scoring.server.ts      Engine de auto-scoring
  tokens/magic-link.server.ts    Gera token cru + hash SHA-256
  rate-limit/public-link.server.ts  10/min por IP, 5/min por token
src/routes/
  _authenticated/patients.$id.tsx  UI do terapeuta (Tabs Atividades/Auditoria)
  p.$token.tsx                     UI pública do paciente
```

---

## 3 modos de uso (`delivery_mode`)

| Modo            | Quem aplica          | Tem link? | Quando usar                |
| --------------- | -------------------- | --------- | -------------------------- |
| `in_session`    | Terapeuta ao vivo    | Não       | Aplicação em consulta      |
| `shared_link`   | Paciente sozinho     | Sim       | Homework entre sessões     |
| `both`          | Terapeuta + paciente | Sim       | Aplicou e prescreveu reforço |

Paciente **nunca** cria conta. Acesso é via token opaco em `/p/$token`.

---

## Fluxo end-to-end

### 1. Prescrição (terapeuta)

```
UI: /patients/$id → aba Atividades → "Enviar atividade"
  │
  ├─ Modal: escolhe atividade + delivery_mode + expiração
  │
  └─ assignActivity({ patientId, workspaceId, activityId, deliveryMode, expiresInHours })
       ├─ valida membership + paciente vivo + atividade publicada
       ├─ se needsLink: gera token cru (UMA vez) + sha256 → token_hash
       ├─ INSERT patient_activities (status=pending, token_hash, expires_at)
       └─ retorna { id, rawToken } — token_cru só é exposto AQUI
```

### 2. Entrega do link

- Modal "Link gerado" mostra a URL **uma única vez** com botão Copiar.
- Email transacional (Resend, S3 etapa 5): subject neutro
  `"Sua terapeuta enviou uma atividade"`. **Bloqueado** se
  `RESEND_BAA_SIGNED != true` → loga `activity.email_skipped_no_baa` e
  devolve link pro terapeuta copiar.

### 3. Resolução pública (paciente, sem login)

```
GET /p/$token (TanStack file route, fora do _authenticated)
  │
  └─ resolvePublicToken({ token })
       ├─ rate limit (IP + token hash)
       ├─ hash + busca patient_activities por token_hash
       ├─ valida: existe? não-revogado? não-usado? não-expirado?
       │     Qualquer falha → mensagem NEUTRA (não revela qual)
       ├─ marca token_first_opened_at + bump open_count
       ├─ status pending → in_progress
       └─ retorna activity (slug, title, archetype, config) — SEM PHI do paciente
```

### 4. Autosave (paciente)

Ver detalhes completos em `docs/autosave-security.md`. Resumo:

- Debounce 2s no client.
- `saveActivityDraft({ token, draft, completionPercent })` cifra com AES-256-GCM
  e faz upsert em `activity_drafts` (UNIQUE por `patient_activity_id`).
- `expires_at` do draft = `token_expires_at` do `patient_activity`.
- **Zero persistência no browser** (sem localStorage/sessionStorage/IndexedDB).
- `getActivityDraft` permite "Continuar de onde parou" ao reabrir o link.
- Audit de draft via trigger `audit_activity_draft_change`. Metadata só
  carrega `patient_id`, `patient_activity_id`, `completion_percent`.

### 5. Submissão final (paciente)

```
submitActivityResponse({ token, responses })
  ├─ rate limit + revalida token (mesmas portas neutras)
  ├─ scoreActivity(archetype, config, responses) → { score, severity, metadata }
  ├─ encryptPHIServer(JSON(responses)) → raw_responses_encrypted
  ├─ INSERT activity_responses (cifrado + score + severity)
  ├─ UPDATE patient_activities SET used_at=NOW(), status='completed', token_hash=NULL
  ├─ DELETE activity_drafts WHERE patient_activity_id=? (purge)
  └─ tela "Recebido. Obrigado por completar."
```

**Garantias:**
- `used_at` torna o token single-use (UPDATE com `.is('used_at', null)` evita race).
- `token_hash=NULL` fecha o acesso permanentemente.
- Resposta cifrada permanece em `activity_responses` para sempre.

### 6. Visualização (terapeuta)

- `listPatientActivities` retorna timeline DESC + flag `has_draft` +
  `draft_completion_percent` (sem decifrar nada).
- Card mostra status real ou `Em andamento · 60%` se há draft ativo.
- "Revogar" → `revokeActivity` muda `status='revoked'` + zera `token_hash`.
  **Não apaga** registro nem resposta. Bloqueado se já foi respondida.
- "Ver respostas" decifra on-demand e abre modal/drawer (a definir na S3.5).

### 7. Auditoria (owner only)

Aba Auditoria em `/patients/$id` chama `listPatientAuditLogs`. RLS de
`audit_logs` já restringe leitura a `has_workspace_role(_, 'owner')`. Lista:

- `activity.assigned`
- `activity.link_opened`
- `activity.draft_saved` / `draft_loaded` / `draft_discarded`
- `activity.submitted`
- `activity.status_changed`
- `activity.response_recorded`

Todos com metadata JSONB **sem PHI** (só UUIDs).

---

## Estados possíveis (`patient_activity_status`)

```
pending      INSERT inicial
in_progress  paciente abriu o link OU tem draft salvo
completed    submit final ocorreu (used_at preenchido)
expired      token_expires_at < now() (set lazy no resolve/submit)
revoked      terapeuta revogou (token_hash zerado)
```

Transições terminais: `completed`, `expired`, `revoked`.
Nenhuma transição apaga `patient_activities` ou `activity_responses`.

---

## Rate limit

In-memory por isolate do worker (suficiente pra S3, migra pra Durable Object
em S5/S6 se abuso for detectado em audit):

| Endpoint                  | Por IP    | Por token |
| ------------------------- | --------- | --------- |
| `resolvePublicToken`      | 10/min    | 5/min     |
| `saveActivityDraft`       | 10/min    | 5/min     |
| `getActivityDraft`        | 10/min    | 5/min     |
| `discardActivityDraft`    | 10/min    | 5/min     |
| `submitActivityResponse`  | 10/min    | 5/min     |

Mensagem de bloqueio = mesma mensagem neutra dos demais erros.

---

## O que está fora de S3

- Lembretes automáticos (SMS/email)
- Recorrência automática
- Atividade composta
- Versionamento de atividade
- Compartilhamento entre terapeutas
- Edição de resposta após submit
- Hash chain dos audit logs (S5/S6)
- MFA (S5)

Pedido novo → "Leda, isso atrasa S3 por X. Mantemos pra Semana Y?"
