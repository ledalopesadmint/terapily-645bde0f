# Magic Link + Atividades — Regras Travadas (S3)

**Status:** APROVADO pela Leda antes da S3. Inegociável. Qualquer desvio precisa de aprovação explícita dela.

Este documento sobrescreve qualquer ambiguidade em outros docs ou memórias. Em caso de conflito, **este vence**.

Espelha `mem://features/magic-link-rules-locked` e é a versão versionada no Git.

---

## 1. Vínculo obrigatório (não negociável)

Todo magic link DEVE estar vinculado a:
- `workspace_id`
- `patient_id`
- `therapist_id` (coluna `assigned_by`)
- `activity_id`
- `patient_activity_id` (a própria linha que carrega o token)

**PROIBIDO:**
- Link genérico
- Link reutilizável entre pacientes
- Link sem paciente
- Reaproveitar token entre atividades

**Princípio:** toda atividade nasce a partir do paciente. Nunca o contrário.

---

## 2. Fluxo oficial end-to-end

1. Terapeuta abre `/patients/:id`
2. Vai pra aba **Atividades**
3. Clica **Enviar atividade**
4. Seleciona atividade (PHQ-9, GAD-7, etc) + delivery_mode + expiração
5. Server cria linha em `patient_activities`
6. Server gera token único (`crypto.randomBytes(32)` → base64url)
7. Server gera link `/p/{token}` e mostra ao terapeuta **1 vez** no modal "Link Generated"
8. Terapeuta envia pelo **canal dele** (WhatsApp / SMS / email pessoal / copiar) — Terapily NUNCA envia direto
9. Paciente acessa sem login
10. Paciente responde
11. Server salva em `activity_responses`
12. Resultado aparece automaticamente na aba **Atividades** do paciente

---

## 3. ⚠️ REGRA CENTRAL — Expiração

**EXPIRA O ACESSO → NÃO EXPIRA O DADO**

| O que expira | O que NÃO expira |
|---|---|
| Token `/p/{token}` (default 7d) | `patient_activities` (linha) |
| Capacidade de preencher após submit | `activity_responses` (resposta) |
| Capacidade de reabrir após `used_at` | Histórico do paciente |
| Draft (`activity_drafts`) — expira junto com o token | Compliance Report / PDF |

**Após expiração ou uso:**
- Link não funciona mais
- Mensagem neutra fixa: **"Este link não está disponível. Peça um novo link ao seu terapeuta."**
- NUNCA revelar qual condição falhou (expirado vs usado vs inexistente vs revogado)

**Nenhum processo pode apagar ou invalidar dados já respondidos.**

Auto-purge de respostas só acontece via política de retenção configurável (piso HIPAA 6 anos), nunca por expiração de token.

---

## 4. Segurança do token

Tabela `patient_activities` carrega:
- `token_hash text UNIQUE` — SHA-256 do token cru (nullable após uso/revogação/expiração)
- `token_expires_at timestamptz NOT NULL` — obrigatório, default 7d
- `created_at timestamptz NOT NULL`
- `token_first_opened_at timestamptz NULL` — primeira abertura válida
- `token_open_count integer NOT NULL DEFAULT 0`
- `used_at timestamptz NULL` — quando paciente fez submit (single-use após submit)
- `status` enum: `pending | in_progress | completed | expired | revoked`

**PROIBIDO:**
- Salvar token cru em qualquer lugar (banco, log, audit, sentry, console)
- Retornar token cru depois do INSERT inicial
- URL contendo nome, email, telefone, ID de paciente, ou qualquer PHI

URL é **apenas** `/p/{token_base64url}`.

---

## 5. Acesso do paciente

- Rota `/p/:token` é **pública** (sem auth, sem layout autenticado)
- Paciente **NUNCA cria conta**
- Paciente **NUNCA faz login**
- Único acesso = link
- Não há endpoint de signup que aceite email de paciente
- Magic link não cria sessão Supabase pro paciente

---

## 6. Resposta e vínculo

`activity_responses` deve conter:
- `patient_activity_id uuid NOT NULL` — FK obrigatório
- `workspace_id uuid NOT NULL` — denormalizado (RLS)
- `patient_id uuid NOT NULL` — denormalizado (timeline rápida)
- `raw_responses_encrypted text` — JSON cifrado AES-256-GCM com `PHI_ENCRYPTION_KEY`
- `score numeric NULL` — não cifrado (precisa indexar)
- `severity` enum NULL — não cifrado
- `submitted_via` enum (`in_session` | `shared_link`)

**PROIBIDO:**
- Resposta órfã (sem `patient_activity_id`)
- Resposta com `patient_id` vindo do client (server resolve sempre via token)
- Resposta sem cifragem das respostas brutas

---

## 7. Auditoria (obrigatória)

Eventos a registrar — todos com `metadata` JSONB **sem PHI** (só UUIDs e enums):
- `activity.assigned` — actor=therapist
- `activity.share_intent` — actor=therapist; metadata: `{channel: 'whatsapp'|'sms'|'mailto'|'copy'}`
- `activity.link_opened` — actor=null/anon
- `activity.submitted` — actor=null/anon
- `activity.status_changed` — actor=therapist|system
- `activity.response_recorded` — actor=null/anon
- `activity.draft_saved` / `activity.draft_loaded` / `activity.draft_discarded` — actor=null/anon
- `compliance_report.generated` — actor=therapist

**PROIBIDO em qualquer audit log:**
- Nome do paciente
- Email do paciente
- Telefone do paciente
- Conteúdo da resposta
- Token cru ou hash

---

## 8. Entrega do link — MANUAL OBRIGATÓRIO

**Terapily NÃO envia comunicação ao paciente.** Sem email automático, sem SMS, sem push. Decisão travada em 2026-04-30 — ver `mem://constraint/no-automated-email-policy`.

Após `assignActivity`, server retorna o token cru **uma vez** e o frontend mostra o modal "Link Generated" com 4 ações:

1. **WhatsApp** — `https://wa.me/{phone?}?text={encoded}`
2. **SMS** — `sms:{phone?}?body={encoded}`
3. **Email pessoal** — `mailto:{email?}?subject=...&body=...` (abre o cliente do terapeuta)
4. **Copiar** — `navigator.clipboard.writeText(link)`

Texto sugerido **editável** pelo terapeuta antes de enviar. Phone/email do paciente são decifrados server-side só na hora de gerar o deep link — nunca persistem em URL nem em audit metadata.

**PROIBIDO:**
- Server function que faça POST pra Resend/SES/Twilio/qualquer API de envio
- `noreply@terapily.com` enviando qualquer coisa pro paciente
- Botão "Send email automatically" no app
- Domínio verificado pra envio em nome do terapeuta

---

## 9. UI — perfil do paciente

`/patients/:id` tem **abas**: **Visão geral** | **Atividades** | **Audit** (owner only)

Aba **Atividades** = timeline cronológica DESC com cards por status:
- **Pendente** (assignment criado, link não aberto)
- **Em andamento** (link aberto pelo paciente, sem submit)
- **Respondido** (submit feito, mostra score + banda + data)
- **Expirado** (passou `expires_at` sem submit)
- **Revogado** (terapeuta cancelou)

**PROIBIDO:**
- Botão "Enviar atividade" solto ao lado do email/telefone
- Lista plana sem agrupamento por status

Botão **Enviar atividade** fica sempre no topo da aba Atividades.

---

## 10. Relatório (Compliance Report)

- Gerado de: `patient_activities` + `activity_responses` + `activity_catalog`
- Sempre vinculado ao paciente
- Histórico **permanente** (não expira com o link)
- Apenas plano **Practice** consegue gerar (gating via `has_feature('compliance_report')`)
- Wording PROIBIDO: "HIPAA-certified", "court-defensible", "legally binding"
- Wording usado: "Audit-ready summary for your records"

---

## 11. Rate limit e enumeração

- `/p/:token` limitado por **IP**: 10 req/min
- `/p/:token` limitado por **token**: 5 tentativas/min (anti-fuzzing do mesmo token)
- Token inválido / expirado / revogado / já usado / inexistente: **mesma resposta neutra** com mesmo timing aproximado

> Implementação inicial em memória do worker (S3). Migrar pra Durable Object ou tabela dedicada em S5/S6 se houver evidência de abuso em audit.

---

## 12. Garantias finais (checklist pré-merge S3)

Antes de qualquer release de S3, confirmar manualmente:

- [ ] Nenhum link é genérico (todo INSERT tem `patient_id` + `assigned_by` NOT NULL)
- [ ] Nenhum resultado fica órfão (FK NOT NULL em `activity_responses.patient_activity_id`)
- [ ] Nenhum PHI aparece em URL
- [ ] Nenhum PHI aparece em email subject/body
- [ ] Nenhum PHI aparece em audit log metadata
- [ ] Nenhum PHI aparece em log de erro (sentry/console)
- [ ] Expiração do token NÃO remove dados (verificar com paciente fictício)
- [ ] Histórico do paciente persiste após token expirado
- [ ] Compliance Report gera mesmo se todos os tokens daquele paciente expiraram
- [ ] Draft é apagado imediatamente após submit final
- [ ] Draft expira junto com o token (não persiste sozinho)

---

## Referências cruzadas

- `docs/s3-definition-of-done.md` — checklist completo de S3
- `docs/autosave-security.md` — regras de `activity_drafts`
- `docs/security.md` — postura de segurança consolidada
- `mem://features/clinical-scales-catalog` — catálogo de escalas
- `mem://features/storage-economics` — política de retenção
