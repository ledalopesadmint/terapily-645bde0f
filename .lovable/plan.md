
# Plano: Layout definitivo dos botões nos boxes de atividade

## O que muda

**Desktop/Tablet (>= sm)** -- Linha de ações:
- Todos os botões ficam em **uma única linha**, alinhados **à direita** (`flex flex-wrap items-center justify-end gap-2`).
- Ordem fixa da esquerda pra direita: **Rel. Terapeuta** | **Rel. Paciente** | **Aplicar** ou **Ver respostas** | **Novo link** | **Revogar** | **Badge de status**.
- Os botões nunca ultrapassam os limites do card (já garantido pelo `overflow-hidden` do Card + `flex-wrap`).

**Mobile (< sm)** -- sem alteração de ordem nesta iteração (já funciona em linhas separadas compactas).

## O que NÃO muda
- Nenhum fluxo, server function, onClick ou lógica condicional de visibilidade.
- Cores, ícones e labels dos botões permanecem idênticos.
- Mobile layout continua como está.

## Alterações técnicas

### 1. `src/routes/_authenticated/patients.$id.tsx` -- bloco desktop (linhas ~857-943)
- Trocar `flex flex-wrap items-center gap-2` por `flex flex-wrap items-center justify-end gap-2`.
- Reordenar os elementos JSX nesta sequência:
  1. Bloco IIFE dos relatórios (Terapeuta primeiro, Paciente segundo -- inverter a ordem interna)
  2. Botão "Aplicar" (condicional)
  3. Botão "Ver respostas" (condicional)
  4. Botão "Novo link" (condicional)
  5. Botão "Revogar" (condicional)
  6. Badge de status (por último, ficará na extrema direita)

### 2. `mem://design/activity-box-layout` -- substituir completamente
- Nova regra: botões alinhados à DIREITA, ordem fixa como descrito acima. Regra anterior apagada.
