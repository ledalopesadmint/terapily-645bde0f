# S3 — Definition of Done

**Status:** Aprovado pela Leda. Implementação em curso.
**Etapa 4 (UI do terapeuta + autosave seguro):** ✅ concluída em 2026-04-29.
**Próxima etapa:** S3 — Etapa 5 (envio de email transacional via Resend, gating por BAA).

S3 só pode ser marcada como concluída quando TODOS os itens abaixo estiverem ✅. Nenhum item é "nice to have" — todos são bloqueantes.

Espelha `mem://features/s3-definition-of-done`.

---

## 1. Schema do banco (migrations aplicadas)

- [x] Tabela `patient_activities` criada com colunas: `id`, `workspace_id`, `patient_id`, `activity_id`, `assigned_by`, `delivery_mode` enum, `token_hash` (UNIQUE), `token_expires_at`, `token_first_opened_at`, `token_open_count`, `used_at` (single-use após submit), `applied_at`, `response_id`, `status` enum, `created_at`, `updated_at`
- [x] Tabela `activity_responses` criada com: `id`, `patient_activity_id`, `workspace_id`, `patient_id`, `activity_id`, `raw_responses_encrypted`, `score`, `severity`, `scoring_metadata`, `submitted_via` enum, `submitted_at`
- [x] Tabela `activity_drafts` criada (ver `docs/autosave-security.md`)
- [x] Enum `delivery_mode`: `in_session`, `shared_link`, `both`
- [x] Enum `submitted_via`: `in_session`, `shared_link`
- [x] Index único em `patient_activities.token_hash`
- [x] `patients` table NÃO foi alterada (zero refator confirmado)

---

## 2. RLS (Row Level Security)

- [x] `patient_activities` tem RLS ativo
- [x] SELECT permitido só pra `is_workspace_member` E (`assigned_by = auth.uid()` OU owner)
- [x] INSERT permitido só pra terapeuta atribuído ou owner
- [x] DELETE bloqueado (sempre soft via `status = 'revoked'`)
- [x] `activity_responses` tem RLS ativo, mesmo padrão de leitura
- [x] INSERT em `activity_responses` REVOKED do client — só via server function com service_role + validação de hash do token
- [x] `activity_drafts`: leitura debug pra owner/assigned therapist; INSERT/UPDATE/DELETE REVOKED do client

---

## 3. Server functions (createServerFn)

- [x] `assignActivity({ patient_id, activity_id, delivery_mode, expires_in_hours })` — cria assignment, gera token cru (retorna 1x), salva só hash, audit
- [x] `listPatientActivities(patient_id)` — timeline join com responses + catalog, ordenada DESC
- [x] `revokeActivity(patient_activity_id)` — soft revoke (status + zera token_hash), audit
- [x] `resolvePublicToken(token)` — público; valida hash + expiração + status, marca first_opened_at + bump open_count, retorna activity sem PHI
- [x] `submitActivityResponse(token, responses)` — cifra resposta, calcula score, grava response, marca used_at + status completed + zera token_hash, **purga draft**, audit
- [x] `saveActivityDraft / getActivityDraft / discardActivityDraft` — público, com rate limit por IP+token
- [x] `generateComplianceReport(patient_id, period)` — PDF agregando atividades submetidas

---

## 4. Auto-scoring engine

- [x] Engine implementada com archetype `quiz_scale` (PHQ-9, GAD-7)
- [x] PCL-5: cluster scores + total (via `scoring.clusters` config)
- [x] Demais escalas usam o mesmo engine genérico (sum/weighted_sum + severity_bands)
- [x] Score salvo em `score` + `severity` na resposta
- [x] Testes unitários pra cada calculadora (PHQ-9, GAD-7, PCL-5, non-scored archetypes)

---

## 5. UI — `/patients/:id` com tabs

**Status: ✅ Etapa 4 concluída.** Módulo migrado pra `src/features/activities/`.

- [x] Rota com tabs: **Visão geral** | **Atividades** | **Auditoria** (owner only)
- [x] Tab Atividades: timeline DESC com cards por status
- [x] Status suportados na timeline:
  - `Pendente` — atividade criada, link ainda não gerado/aberto
  - `Enviado` — link gerado, aguardando paciente abrir
  - `Em andamento · %` — paciente abriu e tem draft salvo (percent vem de `activity_drafts.completion_percent`)
  - `Respondido` — submit final feito (`used_at` preenchido, score calculado)
  - `Expirado` — `token_expires_at` passou sem submit
  - `Revogado` — terapeuta revogou (soft, status + token_hash zerado)
- [x] Botão "Enviar atividade" no topo da aba
- [x] Modal de envio com 3 delivery_modes: **`in_session`** | **`shared_link`** | **`both`**
- [x] Modal coleta: atividade do catálogo + delivery_mode + janela de expiração
- [x] Após criar: link único exibido **one-shot** com botão "Copiar" — token cru nunca mais é retornado pelo backend
- [x] Card de atividade respondida: score + banda + data + botão "Ver respostas"
- [x] Visualização de respostas via **gaveta lateral** (Sheet) com **decifra on-demand** server-side, sem cache no client (sem localStorage/sessionStorage/IndexedDB)
- [x] Cada abertura da gaveta gera audit `activity.response_viewed`
- [x] Aba **Auditoria** owner-only, escopada ao paciente, sem PHI no metadata
- [x] Empty state da aba Atividades


---

## 6. Rota pública `/p/$token` (paciente preenche)

- [x] Rota pública (sem auth, sem layout autenticado)
- [x] Resolve token → busca por `sha256(token) = token_hash`
- [x] Validações em ordem: token existe? não-expirado? não-revogado? não-submetido?
- [x] Falhas → mesma mensagem neutra
- [x] Marca `token_first_opened_at` na primeira abertura válida
- [x] Renderiza atividade SEM PHI do paciente
- [x] Submit: cifra responses + calcula score + marca `used_at` + audit + apaga draft
- [x] Tela final: "Recebido. Obrigado por completar."
- [x] Sem PostHog nessa rota
- [x] Rate limit: 10 req/min por IP, 5 req/min por token
- [x] Autosave silencioso com debounce 2s
- [x] Modal "Continuar / Recomeçar" ao reabrir
- [x] Banner "Você pode começar agora e terminar depois"

---

## 7. Entrega manual do link (substitui email transacional)

**Decisão (2026-04-30):** Resend e email automático REMOVIDOS do escopo S3. Ver `mem://constraint/no-automated-email-policy` e `docs/magic-link-rules-locked.md` §8.

- [x] Modal "Link Generated" exibido **uma vez** após `assignActivity`
- [x] 4 botões: **WhatsApp** (`wa.me`), **SMS** (`sms:`), **Email pessoal** (`mailto:`), **Copiar** (clipboard)
- [x] Texto sugerido editável pelo terapeuta antes de compartilhar
- [x] Phone/email do paciente decifrados server-side só pra preencher o deep link — nunca persistem em URL nem em audit
- [x] Aviso "Este link só será mostrado agora." no modal
- [x] Botão "Gerar novo link" no card de atividade pendente/expirada
- [x] **Sem** server function de envio Resend
- [x] **Sem** template de email transacional
- [x] **Sem** env var `RESEND_BAA_SIGNED`

---

## 8. Compliance Report (PDF)

- [x] Server function `generateComplianceReport(patient_id, { from, to })` retorna PDF (base64)
- [x] Cabeçalho: nome do paciente (decifrado server-side) + terapeuta + workspace + período
- [x] Lista cronológica DESC com nome da atividade + score + banda + indicador de modo
- [x] Apenas Practice gera (gating via `has_feature('compliance_report')`)
- [x] Audit log do download (sem PHI) — `compliance_report.generated`
- [x] Wording PROIBIDO: "HIPAA-certified", "court-defensible", "legally binding" ✓ (verificado)
- [x] Wording usado: "Audit-ready summary for your records" ✓

---

## 9. Audit logs

Eventos obrigatórios (todos com `metadata` JSONB **sem PHI** — só UUIDs/enums):
- [x] `activity.assigned`
- [x] `activity.link_opened`
- [x] `activity.submitted`
- [x] `activity.status_changed`
- [x] `activity.response_recorded`
- [x] `activity.response_viewed` — cada abertura da gaveta lateral pelo terapeuta
- [x] `activity.revoked` — soft revoke pelo terapeuta
- [x] `activity.draft_saved` / `activity.draft_loaded` / `activity.draft_discarded`
- [x] `activity.share_intent` (actor=therapist, metadata: `{patient_activity_id, channel: 'whatsapp'|'sms'|'mailto'|'copy'}`)
- [x] `compliance_report.generated`
- [x] `patient.contact_revealed`

---

## 9.1 Autosave (draft) — implementado

Detalhamento completo em `docs/autosave-security.md`. Confirmação dos invariantes pra fechar Etapa 4:

- [x] Draft cifrado AES-256-GCM com `PHI_ENCRYPTION_KEY` (mesmo padrão de `activity_responses.raw_responses_encrypted`)
- [x] Draft NUNCA salvo em localStorage / sessionStorage / IndexedDB / cache do browser
- [x] Draft em texto puro nunca persiste — só circula em memória durante render do form
- [x] `activity_drafts.expires_at` = `patient_activities.token_expires_at` (draft expira junto com o token)
- [x] Submit final: `submitActivityResponse` apaga o draft antes de retornar (DELETE em `activity_drafts` na mesma transação lógica)
- [x] Draft NÃO gera score, NÃO aparece em `activity_responses`, NÃO entra em Compliance Report
- [x] PHI nunca em URL, audit metadata ou logs (auditoria registra só `patient_activity_id` + `completion_percent`)
- [x] Rate limit aplicado em `saveActivityDraft` e `getActivityDraft` (IP+token)
- [x] Banner "Você pode começar agora e terminar depois" na rota pública `/p/$token`
- [x] Fail-safe: falha de cifragem / token / rate limit → não salva, retorna erro neutro

---

## 9.2 Regra central confirmada

> **Expira o acesso, não o dado.**

- Token (`token_hash`) expira e vira single-use após submit (`used_at`).
- `patient_activities`, `activity_responses` e o futuro Compliance Report permanecem permanentes no workspace do terapeuta.
- Drafts (`activity_drafts`) expiram com o token e são apagados após submit — são rascunho de PHI parcial, não registro clínico.


---

## 10. Cenários de segurança (testes manuais obrigatórios)

### 10.1 Token e magic link
- [ ] Token cru não aparece em log nenhum
- [ ] Token cru não é retornado em nenhum endpoint depois do INSERT inicial
- [ ] Banco dump não revela tokens (só hashes)
- [ ] Token expirado/revogado/usado/inexistente → mesma mensagem neutra
- [ ] Rate limit em `/p/$token` bloqueia após 10 req/min do mesmo IP
- [ ] Rate limit em `/p/$token` bloqueia após 5 tentativas/min do mesmo token
- [ ] Expiração NÃO remove `patient_activities` nem `activity_responses`
- [ ] Compliance Report gera mesmo com todos tokens expirados

### 10.2 Vínculo paciente
- [ ] Impossível criar `patient_activities` sem `patient_id`
- [ ] Impossível criar com `patient_id` de outro workspace (RLS)
- [ ] Server resolve `patient_id` pelo token, não aceita do client
- [ ] Resposta sempre aparece no perfil correto (E2E)

### 10.3 PHI e privacidade
- [ ] URL `/p/$token` não contém PHI
- [ ] Email subject/body sem PHI
- [ ] Resposta cifrada AES-256-GCM com `PHI_ENCRYPTION_KEY`
- [ ] Score numérico não cifrado (indexável)
- [ ] Audit metadata sem PHI
- [ ] Logs de erro sem PHI mesmo em stack trace
- [ ] PostHog não carrega em `/p/$token`

### 10.4 RLS e cross-tenant
- [ ] Terapeuta A não vê `patient_activities` de workspace B
- [ ] Terapeuta A não cria atividade pra paciente de workspace B
- [ ] Owner vê tudo, terapeuta só dos pacientes atribuídos

### 10.5 Compliance Report
- [ ] Basic não consegue gerar (botão bloqueado + endpoint 403)
- [ ] Practice consegue
- [ ] PDF sem wording proibido
- [ ] Audit log da geração

### 10.6 Paciente nunca cria conta
- [x] Rota `/p/$token` sem links de signup/login
- [x] Sem endpoint de signup com email de paciente
- [x] Magic link não cria sessão Supabase

---

## 11. Performance (sanidade)

- [ ] `listPatientActivities` < 300ms p95 com 100 atividades
- [ ] `resolvePublicToken` < 200ms p95
- [ ] `generateComplianceReport` < 5s pra paciente com 50 respostas

---

## 12. Documentação versionada

- [x] `docs/magic-link-rules-locked.md` no repo
- [x] `docs/s3-definition-of-done.md` no repo
- [x] `docs/security.md` no repo
- [x] `docs/autosave-security.md` no repo
- [ ] Atualizar `mem://features/landing-promises-debt` marcando magic link / scoring / PDF como ✅ ao final de S3

---

## 13. Fora de S3 (escopo travado)

- Lembretes automáticos por SMS/email
- Recorrência automática
- Atividade composta
- Versionamento de atividade
- Compartilhar entre terapeutas
- Editar resposta após submit
- Hash chain dos audit logs (S5/S6)
- MFA (S5)

Pedido novo durante S3 → "Leda, isso atrasa S3 por X. Mantemos pra Semana Y?"

---

## 14. Critério de "S3 concluída"

1. Todos os checkboxes ✅
2. Leda fez fluxo end-to-end manualmente: criar paciente → enviar atividade (3 modos) → preencher pelo paciente fictício → ver resultado na aba → gerar PDF
3. Todos os 6 grupos de cenários (10.1–10.6) testados e documentados
4. Nenhum log mostra PHI (grep manual em audit_logs + console + sentry)
5. Memórias e docs atualizados
