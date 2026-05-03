/**
 * /admin — layout com abas do painel administrativo (Leda only).
 */

import { useEffect } from "react";
import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import {
  BookOpen,
  BarChart3,
  CreditCard,
  Sparkles,
  ScrollText,
  Shield,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { Eyebrow } from "@/components/brand/Eyebrow";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

const ADMIN_TABS = [
  { to: "/admin" as const, label: "Acervo", icon: BookOpen, exact: true },
  { to: "/admin/insights" as const, label: "Insights", icon: Sparkles, exact: false },
  { to: "/admin/analytics" as const, label: "Analytics", icon: BarChart3, exact: false },
  { to: "/admin/billing" as const, label: "Billing", icon: CreditCard, exact: false },
  { to: "/admin/audit" as const, label: "Audit Log", icon: ScrollText, exact: false },
];

function AdminLayout() {
  const { hasRole, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !hasRole("admin")) {
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [isLoading, hasRole, navigate]);

  if (isLoading || !hasRole("admin")) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="eyebrow text-muted-foreground">Verificando acesso</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 md:px-10 md:py-14">
      {/* Header */}
      <header className="border-b border-border/50 pb-8">
        <Eyebrow>Painel administrativo</Eyebrow>
        <h1 className="mt-2 font-display text-4xl text-foreground md:text-5xl">
          Administração
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Gerencie o catálogo de ferramentas, acompanhe métricas da plataforma
          e controle billing — tudo num lugar só.
        </p>
      </header>

      {/* Tab nav */}
      <nav
        aria-label="Seções do admin"
        className="mt-6 flex gap-1 overflow-x-auto rounded-lg bg-muted p-1"
      >
        {ADMIN_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.exact
            ? location.pathname === tab.to || location.pathname === tab.to + "/"
            : location.pathname.startsWith(tab.to);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`flex shrink-0 items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* Tab content */}
      <div className="mt-8">
        <Outlet />
      </div>
    </div>
  );
}
