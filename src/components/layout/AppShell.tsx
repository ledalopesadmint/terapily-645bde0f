import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, Users, GamepadIcon, Settings, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { SidebarLogo } from "@/components/brand/SidebarLogo";
import { cn } from "@/lib/utils";
import { TRIAL_DURATION_DAYS } from "@/lib/constants";

/**
 * AppShell — shell autenticado do Terapily.
 *
 * Estética (referência editorial premium · brand book v3):
 * - Sidebar Navy escura full (sidebar tokens), logo "t" Cream + wordmark "terapily" em Cream
 * - Item ativo: tinta Sage sutil (não barra colorida)
 * - Avatar circular no rodapé com nome + botão sair
 * - Trial badge editorial no rodapé
 * - Conteúdo principal: Cream com header limpo (sem avatar duplicado)
 */

interface NavItem {
  label: string;
  to: "/dashboard" | "/welcome" | "/library" | "/admin";
  icon: typeof LayoutDashboard;
  badge?: string;
  adminOnly?: boolean;
  comingSoonWeek?: never;
}

interface ComingSoonItem {
  label: string;
  icon: typeof LayoutDashboard;
  comingSoonWeek: string;
  to?: never;
  badge?: never;
  adminOnly?: never;
}

const liveItems: NavItem[] = [
  { label: "Painel", to: "/dashboard", icon: LayoutDashboard },
  { label: "Acervo", to: "/library", icon: GamepadIcon, badge: "Visualização" },
  { label: "Admin", to: "/admin", icon: ShieldCheck, adminOnly: true },
];

const upcomingItems: ComingSoonItem[] = [
  { label: "Pacientes", icon: Users, comingSoonWeek: "S2" },
  { label: "Ajustes", icon: Settings, comingSoonWeek: "S1" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { workspace, profile, signOut, hasRole } = useAuth();
  const location = useLocation();

  const initials = (profile?.full_name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  const trialDaysLeft = workspace?.trial_ends_at
    ? Math.max(
        0,
        Math.ceil(
          (new Date(workspace.trial_ends_at).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        ),
      )
    : null;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar — Navy escura full, ícones brancos, item ativo Sage sutil */}
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        {/* Logo */}
        <div className="px-6 pb-4 pt-6">
          <Link to="/dashboard" aria-label="Início" className="inline-block">
            <SidebarLogo />
          </Link>
        </div>

        {/* Workspace switcher — read-only na S1 */}
        {workspace && (
          <div className="mx-3 mb-3 rounded-md border border-sidebar-border/60 bg-sidebar-accent/40 px-3 py-2.5">
            <p
              className="text-[0.625rem] font-bold uppercase tracking-[0.12em] text-sidebar-foreground/50"
            >
              Espaço de trabalho
            </p>
            <p className="mt-1 truncate text-sm font-medium text-sidebar-foreground">
              {workspace.name}
            </p>
            <p className="mt-0.5 text-xs capitalize text-sidebar-foreground/55">
              {workspace.role === "owner" ? "Proprietária" : workspace.role}
            </p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-3 py-2">
          {liveItems
            .filter((item) => !item.adminOnly || hasRole("admin"))
            .map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "group flex items-center justify-between gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-sage/15 text-cream font-medium"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Icon
                      className={cn(
                        "h-[18px] w-[18px]",
                        active ? "text-sage" : "text-sidebar-foreground/65 group-hover:text-sidebar-foreground",
                      )}
                    />
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className="text-[0.5625rem] font-semibold uppercase tracking-[0.1em] text-sage/80">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}

          <div className="pt-5">
            <p className="px-3 pb-2 text-[0.5625rem] font-bold uppercase tracking-[0.14em] text-sidebar-foreground/40">
              Em construção
            </p>
            {upcomingItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex cursor-not-allowed items-center justify-between gap-3 rounded-md px-3 py-2.5 text-sm text-sidebar-foreground/35"
                  aria-disabled
                  title={`Em breve · ${item.comingSoonWeek}`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-[18px] w-[18px]" />
                    {item.label}
                  </span>
                  <span className="text-[0.5625rem] font-semibold uppercase tracking-[0.1em] text-sidebar-foreground/40">
                    {item.comingSoonWeek}
                  </span>
                </div>
              );
            })}
          </div>
        </nav>

        {/* Rodapé: trial badge + avatar */}
        <div className="border-t border-sidebar-border/60 px-3 py-3">
          {trialDaysLeft !== null && (
            <div className="mb-3 rounded-md bg-sage/10 px-3 py-2.5">
              <p className="text-[0.5625rem] font-bold uppercase tracking-[0.14em] text-sage">
                Avaliação · {TRIAL_DURATION_DAYS} dias
              </p>
              <p className="mt-1 text-sm text-sidebar-foreground">
                <span className="font-display text-lg">{trialDaysLeft}</span>{" "}
                {trialDaysLeft === 1 ? "dia restante" : "dias restantes"}
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage text-sm font-medium text-navy">
              {initials || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {profile?.full_name ?? "Sem nome"}
              </p>
              <button
                type="button"
                onClick={() => void signOut()}
                className="mt-0.5 inline-flex items-center gap-1 text-[0.6875rem] text-sidebar-foreground/55 transition-colors hover:text-sidebar-foreground"
              >
                <LogOut className="h-3 w-3" aria-hidden />
                Sair
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header mobile-only (sidebar invisível em < md) */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border/60 bg-sidebar px-4 md:hidden">
          <Link to="/dashboard" aria-label="Início">
            <SidebarLogo />
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </header>

        {/* Conteúdo */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
