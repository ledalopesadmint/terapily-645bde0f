# Insights do Catálogo (`/admin`)

## Objetivo

Apoiar a curadoria **manual** do destaque do acervo (`/library` hero) com dados
reais agregados, sem automatizar a decisão. A escolha do destaque continua sendo
editorial — a admin (Leda) é quem clica.

A motivação dessa decisão está na conversa de 29/abr/2026 (avaliação de
viabilidade do "destaque automático"). Resumo do raciocínio:

- **Sem automação agora.** Automatizar o destaque cria viés de feedback (a tool
  mais usada vira ainda mais usada → PHQ-9 e GAD-7 dominam pra sempre) e
  esvazia a curadoria editorial — que é diferencial real frente a
  Therapist Aid / Quenza / NovoPsych.
- **O painel resolve o problema de fato:** dar dado bom à pessoa que decide,
  sem trocá-la.
- **Reabrir em S5/S6** se houver volume real e cansaço operacional da curadoria.

## Onde mora

- Server function: `src/server/admin.functions.ts` → `getCatalogInsights`
- UI: `src/routes/_authenticated/admin.index.tsx` → `InsightsSection`
- Tabela de apoio: `public.featured_activity_history` (criada nessa entrega)

## Regras de segurança (não negociáveis)

- **Apenas admin** lê os insights (cheque `has_role(uid, 'admin')` na server
  function + RLS).
- Roda com `supabaseAdmin` apenas pra agregar cross-workspace **métricas de
  catálogo**. Nunca retorna `patient_id`, `workspace_id`, conteúdo de resposta,
  PHI ou qualquer dado clínico — só `activity_id` + título + contagens.
- Sem cache em banco. Sem cron. Sem persistência derivada.

## Queries

### 1. Top mais usadas (últimos 30 dias)

```sql
-- Conceitual (na prática agregamos no Node):
SELECT activity_id, COUNT(*) AS uses
FROM patient_activities
WHERE created_at >= now() - interval '30 days'
GROUP BY activity_id
ORDER BY uses DESC
LIMIT 3;
```

### 2. Maior taxa de conclusão (lifetime)

Conclusão = `used_at IS NOT NULL` (paciente enviou a resposta — sinal mais
robusto que confiar só no enum `patient_activity_status`).

Filtro: mínimo de **10 envios** pra entrar no ranking. Abaixo disso é ruído.

```sql
SELECT
  activity_id,
  COUNT(*) AS assigned,
  COUNT(used_at) AS completed,
  ROUND(100.0 * COUNT(used_at) / COUNT(*)) AS pct
FROM patient_activities
GROUP BY activity_id
HAVING COUNT(*) >= 10
ORDER BY pct DESC
LIMIT 3;
```

### 3. Última adicionada

```sql
SELECT id, title, slug, created_at
FROM activity_catalog
ORDER BY created_at DESC
LIMIT 1;
```

### 4. Nunca foi destaque

A coluna `activity_catalog.is_featured` é sobrescrita a cada troca, então não
serve pra histórico. Por isso criamos `featured_activity_history`:

```sql
CREATE TABLE featured_activity_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL,
  set_by uuid,
  set_at timestamptz NOT NULL DEFAULT now()
);
```

`setFeaturedActivity` insere uma linha aqui sempre que liga um destaque novo
(best-effort: falha de insert não bloqueia o destaque). A query do painel:

```sql
SELECT id, title, slug, status
FROM activity_catalog
WHERE id NOT IN (SELECT activity_id FROM featured_activity_history)
LIMIT 3;
```

## Performance

A query roda só quando `/admin` carrega o painel (e quando o destaque muda).
Não esperamos volume que justifique cache em S2-S4. Se virar gargalo:

1. Memoizar em memória do worker por ~1h (chave: `userId`).
2. Só depois pensar em materialized view ou tabela derivada.

## O que NÃO fazer

- ❌ Selecionar destaque automaticamente.
- ❌ Cron job.
- ❌ Persistir os insights numa tabela derivada.
- ❌ Expor a query via RLS pro client (precisa ser server function admin-only).
- ❌ Mostrar `patient_id`, `workspace_id` ou qualquer chave que vincule um
  uso a uma pessoa real.

## FUTURE (S5/S6)

Quando houver volume real (>50 usos/mês por tool e múltiplos terapeutas
ativos), avaliar:

- Modo automático **opt-in** (toggle no `/admin`).
- Mínimo de uso pra qualquer sugestão (ex: 50).
- Confirmação manual antes de promover (sugestão, não substituição).
- Audit log de toda promoção automática.
- Alerta pra evitar destacar a mesma tool 2 meses seguidos (combate viés).

Comentário marcador no código: procurar por `FUTURE (S5/S6)` em
`src/server/admin.functions.ts` e `src/routes/_authenticated/admin.index.tsx`.
