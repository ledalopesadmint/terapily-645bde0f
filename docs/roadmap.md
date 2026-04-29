# Terapily — Roadmap

## Visão geral — 6 semanas até o Beta

| Semana | Foco | Status |
|---|---|---|
| S1 | Fundação: auth, workspaces, RLS, audit, brand | ✅ done |
| S2 | Pacientes (CRUD + AES-GCM-256) + Billing real (Stripe BYOK) | ✅ done |
| S3 | Activity catalog + scoring + delivery_mode + magic link + PDF | próxima |
| S4 | Notas de sessão + Modo escuro + Resend BAA (transacional) | planejado |
| S5 | Agenda + MFA real (TOTP) + Delete account + retenção/auto-purge | planejado |
| S6 | QA + performance + landing pública + beta + hash chain de audit | planejado |

## S1 — Fundação (done)

- Auth (email/senha + Google OAuth via Lovable Cloud).
- `workspaces` + `workspace_members` + `is_workspace_member()` + `has_workspace_role()`.
- `user_roles` separado, `has_role()` SECURITY DEFINER. Single-admin enforced (admin@terapily.com via unique index parcial).
- `audit_logs` append-only, INSERT REVOKED do client, metadata só com UUIDs.
- `feature_flags` + `has_feature()`.
- Brand book v3 aplicado (paleta, tipografia, voz).
- Landing pública EN-US + app interno PT-BR.

## S2 — Pacientes + Billing (done)

### Pacientes
- CRUD com **AES-GCM-256** em `name`, `email`, `phone` (chave `PHI_ENCRYPTION_KEY` só no servidor).
- Cadastro mínimo: apelido + iniciais + tags (não-PHI) + nome/email/telefone cifrados.
- `audit_patient_change()` trigger: created, soft_deleted, restored, status_changed, reassigned. **Nunca PHI no metadata.**
- Soft delete jurídico: `EXCLUIR {apelido}` + aviso de retenção HIPAA. Dados saem do relatório vivo, ficam disponíveis pra audit do Practice.
- Copy-on-click PHI: descriptografa só sob demanda, audita em `patient.phi_copied`, auto-clear de clipboard em 30s.
- UI: avatar+apelido como botão único clicável (affordance unificada).
- Gating de plano em `createPatient` via `subscriptions.limits.max_patients` + `workspace_active_patient_count()`.

### Billing — Stripe BYOK (LemonSqueezy descartado, Stripe gerenciado Lovable descartado)
- Schema: `subscriptions`, `stripe_events` (idempotência), `stripe_products`.
- Server functions: `createCheckoutSession`, `createBillingPortalSession`.
- Webhook idempotente em `/api/public/stripe-webhook`: `checkout.session.completed`, `customer.subscription.{created,updated,deleted}`, `invoice.payment_{succeeded,failed}`.
- Audit: `audit_subscription_change()` trigger registra created / status_changed / tier_changed.
- Secrets configurados: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_PRACTICE`.

### Pendências de validação antes de fechar oficialmente
1. **Smoke test ponta a ponta de checkout em test mode** (cartão `4242 4242 4242 4242`) — confirmar `subscriptions.status='active'` e linha em `stripe_events` com o `evt_...`.
2. **Decisão de produto sobre limite atingido** (ver `technical-debt.md` item 6).
3. Teste manual de limite Basic (criar 21º paciente → ver mensagem) — pode rodar junto com QA da S6.

## S3 — Activity catalog + delivery (próxima)

- Catálogo de 33 escalas validadas (PHQ-9, GAD-7, PCL-5...) com auto-scoring.
- `delivery_mode`: `in_session` / `shared_link` / `both`.
- Magic link sem login pra paciente (token hash + expiração).
- `activity_reports` + `clinical_signals`.
- Exportação PDF.
- ISI e SCS-SF cortadas (licença Pearson paga).

## S4–S6
Ver `mem://features/roadmap-6-weeks` para o detalhamento de cada semana.

## Future plan architecture

A arquitetura suporta **4 planos**. Apenas Basic e Practice serão ativados no MVP.

### 1. Basic — implementado
- 1 terapeuta solo, 1 workspace, 1 owner/therapist.
- Limite: 20 pacientes ativos.

### 2. Practice — implementado
- até 2 terapeutas, 1 workspace compartilhado.
- Owner + até 1 therapist adicional.
- Cada terapeuta vê apenas seus próprios pacientes.
- Limite: 50 pacientes ativos.
- Compliance Report exportável.

### 3. Clinic — **futuro, não implementar agora**
- até 10 terapeutas, vários no mesmo workspace.
- **Arquitetura já suporta sem refator** (workspace_members, supervisor enum, subscriptions.limits).

### 4. Patient (B2C) — **futuro, não implementar agora**
- Conta própria do paciente, sem vínculo obrigatório a workspace clínico.
- Ajustes futuros: `handle_new_user` ler `account_type`; nova tabela `therapist_patient_links` com consentimento.

## Princípios não-negociáveis

1. Backend valida tudo. Frontend só reflete.
2. `subscriptions.limits` é declarativo — nunca fonte de verdade para segurança.
3. RLS sempre habilitada.
4. Audit append-only com metadata sem PII/PHI.
5. Roles globais e roles de workspace nunca se misturam.
6. Nenhuma feature futura pode exigir refator estrutural.
