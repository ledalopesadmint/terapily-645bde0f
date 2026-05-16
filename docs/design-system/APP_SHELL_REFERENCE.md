# APP SHELL REFERENCE — Terapily (legacy)

> Estrutura do shell autenticado deste projeto antigo, descrita de forma agnóstica de runtime. Para reimplementar no novo core sem herdar acoplamentos.

---

## Topologia

```
┌──────────────────────────────────────────────────────────┐
│ <div flex min-h-screen bg-background>                    │
│  ┌────────────┐ ┌────────────────────────────────────┐   │
│  │  SIDEBAR   │ │  MAIN                              │   │
│  │  Navy      │ │  Cream                             │   │
│  │  w-64      │ │  flex-1 min-w-0 flex-col           │   │
│  │  sticky    │ │   ┌────────────────────────┐       │   │
│  │  h-screen  │ │   │ Header mobile-only h-14│       │   │
│  │  hidden md │ │   └────────────────────────┘       │   │
│  │            │ │   <main flex-1>{children}</main>   │   │
│  └────────────┘ └────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

---

## Sidebar (desktop, md+)

Contêiner: `sticky top-0 hidden h-screen w-64 shrink-0 flex-col self-start bg-sidebar text-sidebar-foreground md:flex`.

Estrutura vertical:

1. **Brand** — `px-6 pb-4 pt-6` → `<Link to="/dashboard"><SidebarLogo /></Link>`.
2. **Workspace switcher** — chip `mx-3 mb-3 rounded-md border border-sidebar-border/60 bg-sidebar-accent/40 px-3 py-2.5`. Eyebrow `text-[0.625rem]` tracking `0.12em` cor `text-sidebar-foreground/50`. Linha 1: nome (truncate). Linha 2: role capitalizada `text-xs text-sidebar-foreground/55`.
3. **Nav** — `flex-1 space-y-0.5 px-3 py-2`. Cada item:
   ```
   group flex items-center justify-between gap-3 rounded-md px-3 py-2.5 text-sm transition-colors
   ```
   - Inactive: `text-sidebar-foreground/75 hover:bg-sidebar-accent`.
   - Active: `bg-sage/15 text-cream font-medium`; ícone `text-sage`.
   - Badge opcional à direita: `text-[0.5625rem] font-semibold uppercase tracking-[0.1em] text-sage/80`.
4. **Seção "Em construção"** — eyebrow `text-[0.5625rem]` tracking `0.14em`, cada item desabilitado `cursor-not-allowed text-sidebar-foreground/35` com badge da semana.
5. **Rodapé contextual** — `border-t border-sidebar-border/60 px-3 py-3`:
   - Bloco contextual (admin Mauve / plano ativo Sage / trial Sage / trial-expirado Mauve), `rounded-md px-3 py-2.5`, eyebrow microscópica + label Cormorant.
   - Linha do avatar: círculo Sage `h-9 w-9 rounded-full bg-sage text-sm font-medium text-navy` com iniciais + nome + botão "Sair" minúsculo.

---

## Header mobile-only (< md)

`flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border/60 bg-sidebar px-4 md:hidden`.

Contém: `<SidebarLogo />` à esquerda, botão circular logout `h-9 w-9 rounded-full` à direita. Sidebar desktop é totalmente escondida (`hidden md:flex`).

---

## Main

`<div className="flex min-w-0 flex-1 flex-col">` →
- Header mobile (acima)
- `<main className="flex-1">{children}</main>`

Páginas internas usam containers próprios (`max-w-6xl mx-auto px-6 py-10` é o padrão recorrente).

---

## Princípios (para reimplementação no novo core)

- **Não acoplar a auth no shell**. O shell visual recebe `workspace`, `profile`, `role`, `subscription` por props/context, nunca chama queries diretas.
- **Não esconder a sidebar completamente** em desktop. Quando colapsada, mantém mini-strip de ícones (futuro).
- **SidebarTrigger no header**, nunca dentro da sidebar (offcanvas friendly).
- **Active route detection** via roteador do novo core — preserve o padrão `bg-sage/15 text-cream font-medium`.
- **Badge editorial pequenina** é parte do vocabulário — não substituir por `<Badge variant="outline">` cinza.
- **Cores via tokens semânticos** (`--sidebar`, `--sidebar-foreground`, `--sage`, `--cream`). Nunca hex direto no JSX.

---

## Anti-padrões observados no legacy (evitar replicar)

- `AppShell.tsx` consome `useAuth()` diretamente — no novo core, separar `<AppShellLayout />` (visual puro) de `<AppShellContainer />` (consome contexto).
- `AppShell.tsx` consome `useQuery(getCurrentSubscription)` — no novo core, sub passa por prop.
- Lista de rotas hardcoded com tipos literais — no novo core, registrar nav items via registry/module.
