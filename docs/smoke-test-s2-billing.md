# Smoke Test S2 — Billing Stripe (test mode)

**Objetivo:** confirmar que um checkout completo cria/atualiza a `subscription` via webhook.
**Tempo estimado:** 10 minutos.
**Quando rodar:** antes de fechar a S2 oficialmente.

---

## Pré-requisitos (confirmar uma vez)

1. Você está logada na conta da Stripe **em modo Test** (toggle "Test mode" ligado no canto superior direito do dashboard Stripe).
2. Os secrets do projeto estão com chaves de **teste** (começam com `sk_test_...` e `whsec_...`):
   - `STRIPE_SECRET_KEY` → `sk_test_...`
   - `STRIPE_WEBHOOK_SECRET` → `whsec_...`
   - `STRIPE_PRICE_BASIC` → `price_...` (price de teste do plano Basic)
   - `STRIPE_PRICE_PRACTICE` → `price_...` (price de teste do plano Practice)
3. O webhook na Stripe (Developers → Webhooks) aponta pra:
   `https://www.terapily.com/api/public/stripe-webhook`
   (ou a URL publicada equivalente)
   e está escutando os eventos:
   - `checkout.session.completed` — vincula `stripe_customer_id` ao workspace; **crítico** (retry se workspace não resolver).
   - `customer.subscription.created` — sincroniza `subscriptions` (status, tier, period_end); **crítico**.
   - `customer.subscription.updated` — idem; **crítico**.
   - `customer.subscription.deleted` — idem; **crítico**.
   - `customer.subscription.trial_will_end` — **audit-only** (`billing.trial_will_end`). Hoje só registra `{stripe_subscription_id, trial_end}` no `audit_logs`. Não envia email nem altera status. Prepara aviso ao usuário (S5).
   - `invoice.payment_succeeded` — resolve workspace via customer; audit genérico.
   - `invoice.payment_failed` — **audit estruturado** (`billing.payment_failed`). Resolve workspace via customer. Registra `{invoice_id, stripe_subscription_id, amount_due, currency, attempt_count, next_payment_attempt}`. Não altera status manualmente — quem reflete `past_due`/`unpaid` é o `customer.subscription.updated`. Serve pra suporte e painel admin futuro.
   - `charge.dispute.created` — **audit-only** (`billing.dispute_created`). Resolve workspace via `charge → customer`. Registra `{stripe_dispute_id, stripe_charge_id, amount, currency, reason, status}`. Se não conseguir resolver workspace, devolve **500 sem marcar como processado** pra Stripe reentregar — não perdemos sinal de chargeback. Prepara painel admin financeiro (S6).

> **Garantias do webhook (regras inegociáveis):**
> - **Assinatura verificada** com `STRIPE_WEBHOOK_SECRET` antes de qualquer leitura do payload.
> - **Idempotência por `event.id`** via `stripe_events`. Duplicado retorna `200 ok (duplicate)` sem reprocessar.
> - **Nunca marca como processado antes de completar a atualização local.** Se a sincronização falhar (workspace não resolve, price desconhecido, UPDATE no banco falha), o handler devolve `500` e a Stripe reentrega.
> - **Eventos críticos** (`checkout.session.completed`, `customer.subscription.{created,updated,deleted}`) **exigem `workspace_id` resolvido** — caso contrário, `500` sem `markProcessed`. Evita "ghost paid plan" (assinatura ativa no Stripe sem espelho local).
> - **`tier` nunca é gravado como `null` silenciosamente.** Se o `price_id` não existir em `stripe_products` (mesmo `inactive`), o handler devolve `500` em eventos de subscription. Isso protege downgrades Practice → Basic com price antigo desativado.
> - **Audit metadata é PII-safe.** Nunca contém email, nome, cartão, endereço ou dados do paciente — só IDs Stripe, valores numéricos e timestamps.
> - **Logs de erro são estruturados** (JSON com `op`/`code`/`event_id`) e nunca imprimem o payload completo do evento.

> Se algum dos itens acima estiver faltando, me avisa antes de continuar — eu te ajudo a configurar.

---

## Passo a passo do teste

### 1. Crie uma conta de teste no app

1. Abra o app em modo anônimo do navegador (pra não conflitar com sua sessão de admin).
2. Faça signup com um email novo, ex: `teste+billing01@terapily.com`.
3. Confirme o email se for pedido.
4. Faça login.

**O que esperar:** você cai no app já com workspace pessoal criado e subscription `trialing` automática (handle_new_user faz isso).

### 2. Vá pra tela de billing/upgrade

1. Navegue até a página de configurações de plano (provavelmente `/settings/billing` ou similar — me diga se não encontrar).
2. Clique em **"Assinar Basic"** (ou Practice, tanto faz pro teste).

**O que esperar:** redireciona pra Stripe Checkout (URL `checkout.stripe.com/...`).

### 3. Complete o checkout com cartão de teste

Use estes dados:

| Campo | Valor |
|---|---|
| Cartão | `4242 4242 4242 4242` |
| Validade | qualquer data futura, ex: `12/34` |
| CVC | qualquer 3 dígitos, ex: `123` |
| Nome | qualquer |
| CEP/ZIP | qualquer válido, ex: `12345` |

Clique em **Pagar / Subscribe**.

**O que esperar:** redireciona de volta pro app com mensagem de sucesso.

### 4. Confira o resultado no banco

Cole no chat **uma de cada vez** e me manda o resultado. Eu rodo as queries:

**Query A — assinatura virou ativa?**
```sql
select id, workspace_id, provider, tier, status, stripe_subscription_id, current_period_end
from subscriptions
where workspace_id = (
  select workspace_id from workspace_members
  where user_id = (select id from auth.users where email = 'teste+billing01@terapily.com')
);
```
**Resultado esperado:**
- `provider` = `stripe`
- `tier` = `basic` (ou `practice`, conforme o que você assinou)
- `status` = `active`
- `stripe_subscription_id` preenchido (`sub_...`)
- `current_period_end` no futuro

**Query B — webhook foi processado e ficou registrado?**
```sql
select id, type, workspace_id, processed_at
from stripe_events
order by processed_at desc
limit 5;
```
**Resultado esperado:** linhas recentes com `type` em (`checkout.session.completed`, `customer.subscription.created`, `invoice.payment_succeeded`), todas com `processed_at` preenchido.

**Query C — audit registrou a mudança?**
```sql
select action, resource_type, metadata, created_at
from audit_logs
where workspace_id = (
  select workspace_id from workspace_members
  where user_id = (select id from auth.users where email = 'teste+billing01@terapily.com')
)
and resource_type = 'subscription'
order by created_at desc;
```
**Resultado esperado:** entradas `subscription.created` e/ou `subscription.status_changed` (de `trialing` → `active`) e `subscription.tier_changed` (de `solo` → `basic`/`practice`).

### 5. (Opcional) Teste o portal de billing

1. De volta no app, clique em **"Gerenciar assinatura"** (ou similar).

**O que esperar:** abre o Customer Portal da Stripe onde você consegue ver a fatura, atualizar cartão, cancelar.

### 6. (Opcional) Teste cancelamento

1. No portal, clique **Cancelar assinatura**.
2. Volte ao app e rode a Query A de novo.

**Resultado esperado:** `status` muda pra `canceled` (ou `active` com cancel_at_period_end, dependendo da config Stripe).

---

## Se algo der errado

| Sintoma | O que provavelmente é | O que mandar pra mim |
|---|---|---|
| Checkout não abre, dá erro 500 | Server function `createCheckoutSession` falhando | Print do console do navegador + URL atual |
| Checkout abre mas redirect de volta dá erro | URL de retorno mal configurada | Print da tela de erro |
| Voltei mas Query A mostra `status='trialing'` | Webhook não chegou ou não foi processado | Print da página de Webhooks da Stripe (Developers → Webhooks → seu endpoint → "Recent deliveries") |
| Query B vazia | Webhook não chegou na URL ou assinatura inválida | Mesmo print acima |
| Webhook na Stripe mostra erro 401 | `STRIPE_WEBHOOK_SECRET` errado | Confirma o valor do secret comigo |

---

## Limpeza depois do teste

Como é tudo modo teste, **nada de cobrança real aconteceu**. Mas vale:

1. Na Stripe (test mode) → Customers → achar o cliente do email de teste → cancelar a subscription.
2. No app, deletar a conta de teste (ou só deixar lá — não atrapalha).

---

## Próximo passo depois que passar

Avisa que passou, e a S2 é declarada **oficialmente fechada**. Aí decidimos:
- Item 6 do `technical-debt.md` (mensagem de limite de pacientes): qual dos 4 caminhos?
- Começar S3 (activity catalog + delivery_mode + magic link + PDF).
