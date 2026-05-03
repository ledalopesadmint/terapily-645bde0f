
# Admin Audit Console — Proteção Jurídica Completa

## Análise da sua pergunta

**Vai contra alguma política?** Não. Pelo contrário — é um controle operacional obrigatório. Razões:

1. **Admin é único** (Leda, enforced pelo banco). Sem risco de acesso indevido por terceiros.
2. **HIPAA permite** acesso do processador (Terapily) a PHI para "health care operations" e defesa legal.
3. **Audit logs de pacientes excluídos são permanentes** por design (purge apaga PHI, mas audit_logs ficam com UUIDs).
4. Os dados PHI continuam cifrados — o admin vê registros estruturais (scores, timestamps, status), não texto livre de pacientes.

## O que será implementado

### 1. RLS: Admin read-only em todas as tabelas

Uma migration adicionando policy `"tabela: admin read all"` (SELECT only) em 10 tabelas que hoje bloqueiam o admin:

- `patient_activities`, `activity_responses`, `activity_consents`, `activity_drafts`
- `patients`, `ephemeral_activities`, `ephemeral_responses`
- `workspaces`, `workspace_members`, `subscriptions`

Zero impacto nos terapeutas — policies são permissivas (somam-se às existentes).

### 2. Nova aba: `/admin/compliance` — Compliance Console

Painel de navegação hierárquico para o admin acessar dados completos:

**Nível 1 — Lista de Workspaces**
- Todas as workspaces com: nome, owner, plano, quantidade de pacientes ativos, total de atividades
- Busca por nome/ID

**Nível 2 — Workspace selecionado**
- Membros (terapeutas) com role e data de entrada
- Lista de pacientes (display_name + initials + ID único — sem PHI exposto)
- Contadores: pacientes ativos, excluídos (na janela 30d), purgados
- Filtro por terapeuta (preparado para multi-terapeuta futuro)

**Nível 3 — Paciente selecionado (por ID)**
- Histórico completo de atividades (patient_activities + ephemeral_activities + habit_links)
- Status de cada atividade (pending/completed/expired/revoked)
- Registros de consentimento (activity_consents)
- Registros de auditoria filtrados por esse paciente
- Flag: paciente excluído/purgado (dados de audit permanecem)

**Navegação**: Workspace → Terapeuta (opcional) → Paciente (por ID) → Atividades + Audit trail

### 3. Dados de pacientes excluídos

- Audit logs de pacientes purgados continuam acessíveis (por design, audit nunca é apagado)
- O admin verá registros com display_name `[purged]` e initials `••` — identifica pelo UUID
- Isso garante que mesmo após exclusão, o histórico de ações existe para defesa

### 4. Exportação de evidência

- Botão "Exportar relatório completo" que gera PDF com todos os registros de um workspace/paciente
- Inclui: timeline de atividades, consentimentos, audit trail, timestamps
- Carimbo anti-adulteração (hash chain dos registros incluídos)
- Formato consistente com o template de Audit Report PDF já aprovado

### 5. Memória

Salvar regra em `mem://features/admin-compliance-console`: admin tem SELECT em todas as tabelas, painel `/admin/compliance` com navegação hierárquica, exportação de evidência, justificativa legal HIPAA. Toda nova tabela com dados de workspace DEVE incluir policy `admin read all`.

## Detalhes técnicos

### Migration SQL (~10 policies)
```sql
CREATE POLICY "patient_activities: admin read all"
  ON public.patient_activities FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
-- repetido para as 9 tabelas restantes
```

### Arquivos
- **Migration**: 1 arquivo SQL com as 10 policies
- **Nova rota**: `src/routes/_authenticated/admin.compliance.tsx`
- **Server functions**: `src/server/admin-compliance.functions.ts` + `.server.ts` (queries agregadas)
- **Aba no layout admin**: adicionar "Compliance" ao array de tabs em `admin.tsx`

### Segurança
- Toda ação do admin no console é auditada (audit_logs já registra queries do admin)
- Acesso é read-only — admin não modifica dados de nenhum workspace
- PHI cifrado permanece cifrado — admin vê scores, status e timestamps, não texto livre
