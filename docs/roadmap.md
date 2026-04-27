# Terapily — Roadmap

## Visão geral — 6 semanas até o Beta

| Semana | Foco | Status |
|---|---|---|
| S1 | Fundação: auth, workspaces, RLS, audit, brand | em andamento |
| S2 | Pacientes (CRUD + AES-GCM) + Billing real (LemonSqueezy) | planejado |
| S3 | Tarefas (homework) + estrutura de Jogos | planejado |
| S4 | Notas de sessão + Modo escuro | planejado |
| S5 | Agenda + MFA real + Delete account | planejado |
| S6 | QA + performance + landing + beta | planejado |

## Future plan architecture

A arquitetura suporta **4 planos**. Apenas Basic e Practice serão ativados no MVP.

### 1. Basic — implementado
- 1 terapeuta solo
- 1 workspace
- 1 owner/therapist
- Pacientes vinculados ao próprio terapeuta

### 2. Practice — implementado (validação completa em S2)
- até 2 terapeutas
- 1 workspace compartilhado
- Owner + até 1 therapist adicional
- Cada terapeuta vê apenas seus próprios pacientes
- Owner pode ter visão ampliada (regra a confirmar)

### 3. Clinic — **futuro, não implementar agora**
- até 10 terapeutas
- 1 workspace = clínica
- Vários terapeutas no mesmo workspace
- Cada terapeuta vê apenas seus pacientes
- Owner/admin pode ver dados conforme permissão
- Supervisor terá regras próprias de supervisão
- **Arquitetura já suporta sem refator** (workspace_members, supervisor enum, subscriptions.limits)

### 4. Patient (B2C) — **futuro, não implementar agora**
- Conta própria do paciente
- Área individual no app
- Recursos, exercícios, jogos e histórico próprios
- Terapeuta só vê dados se houver vínculo/consentimento explícito
- Paciente NÃO pertence a workspace clínico
- **Ajustes futuros necessários:**
  - `handle_new_user` precisa ler `account_type` e pular criação de workspace para pacientes
  - Nova tabela `therapist_patient_links` com consentimento

## Princípios não-negociáveis

1. Backend valida tudo. Frontend só reflete.
2. `subscriptions.limits` é declarativo — nunca fonte de verdade para segurança.
3. RLS sempre habilitada.
4. Audit append-only com metadata sem PII.
5. Roles globais e roles de workspace nunca se misturam.
6. Nenhuma feature futura pode exigir refator estrutural.
