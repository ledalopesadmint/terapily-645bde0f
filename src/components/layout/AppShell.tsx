import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, Users, GamepadIcon, Settings, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";
import { TRIAL_DURATION_DAYS } from "@/lib/constants";

/**
 * AppShell — shell autenticado do Terapily.
 *
 * Brand book: sidebar Navy (sidebar tokens) sobre Cream, header com avatar.
 * WorkspaceSwitcher é read-only por enquanto (multi-workspace UI só em M3+,
 * mas o schema já suporta).
 *
 * Itens "Em breve" estão visíveis pra mostrar o caminho do produto, mas
 * desabilitados — sem fluxo fake.
 */

interface NavItem {
  label: string;
  to: "/dashboard" | "/welcome" | "/library" | "/admin";
  icon: typeof LayoutDashboard;
  badge?: string; // ex: "Visualização" pra rotas em protótipo
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
  { label: "Ajustes", icon: Settings, comingSoonWeek: "S1 · Sexta" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { workspace, profile, signOut, hasRole } = useAuth();
  const location = useLocation();

  // Iniciais para avatar fallback
  const initials = (profile?.full_name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  // Trial countdown (compartilhado com dashboard, mas mostrado também no shell)
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
      {/* Sidebar — Navy sobre Cream (proporção 30% Navy do brand book) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="px-6 py-6">
          <Link to="/dashboard" aria-label="Início">
            <Logo size="sm" />
          </Link>
        </div>

        {/* Workspace switcher — read-only na S1 */}
        {workspace && (
          <div className="mx-3 mb-2 rounded-md border border-sidebar-border bg-sidebar-accent/40 px-3 py-2.5">
            <p className="eyebrow !text-[0.625rem] !text-muted-foreground">
              Espaço de trabalho
            </p>
            <p className="mt-1 truncate text-sm font-medium text-sidebar-foreground">
              {workspace.name}
            </p>
            <p className="mt-0.5 text-xs capitalize text-muted-foreground">
              {workspace.role === "owner" ? "Proprietária" : workspace.role}
            </p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {liveItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
                {item.badge && (
                  <span className="text-[0.625rem] font-medium uppercase tracking-wider text-secondary-foreground/80">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="pt-4">
            <p className="px-3 pb-2 text-[0.625rem] font-bold uppercase tracking-[0.12em] text-muted-foreground/80">
              Em construção
            </p>
            {upcomingItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex cursor-not-allowed items-center justify-between gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground/70"
                  aria-disabled
                  title={`Em breve · ${item.comingSoonWeek}`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </span>
                  <span className="text-[0.625rem] font-medium uppercase tracking-wider text-secondary">
                    {item.comingSoonWeek}
                  </span>
                </div>
              );
            })}
          </div>
        </nav>

        {/* Trial badge no rodapé do sidebar */}
        {trialDaysLeft !== null && (
          <div className="mx-3 mb-3 rounded-md border border-secondary/30 bg-secondary/10 px-3 py-2.5">
            <p className="eyebrow !text-secondary-foreground">
              Avaliação · {TRIAL_DURATION_DAYS} dias
            </p>
            <p className="mt-1 text-sm text-sidebar-foreground">
              <span className="font-display text-lg">{trialDaysLeft}</span>{" "}
              {trialDaysLeft === 1 ? "dia restante" : "dias restantes"}
            </p>
          </div>
        )}
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border/60 bg-background/60 px-4 backdrop-blur md:px-8">
          {/* Mobile logo */}
          <div className="md:hidden">
            <Link to="/dashboard" aria-label="Início">
              <Logo size="sm" />
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-end gap-3">
            {/* Avatar */}
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-foreground">
                  {profile?.full_name ?? "Sem nome"}
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                {initials || "?"}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </header>

        {/* Conteúdo */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
