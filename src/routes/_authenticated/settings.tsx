import { createFileRoute, Outlet, Link, useLocation } from "@tanstack/react-router";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [{ title: "Ajustes · Terapily" }],
  }),
  component: SettingsLayout,
});

const navItems = [
  { to: "/settings/profile" as const, label: "Perfil" },
  { to: "/settings/workspace" as const, label: "Espaço de trabalho" },
  { to: "/settings/security" as const, label: "Segurança", badge: "S5" },
  { to: "/settings/billing" as const, label: "Cobrança", badge: "S2" },
];

function SettingsLayout() {
  const location = useLocation();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8 sm:py-14">
      <header>
        <Eyebrow>Ajustes</Eyebrow>
        <h1 className="mt-3 font-display text-4xl text-foreground sm:text-5xl">
          Sua conta, do seu jeito.
        </h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          Tudo o que define como o Terapily se comporta com você.
        </p>
      </header>

      <div className="mt-10 grid gap-10 md:grid-cols-[200px_1fr]">
        {/* Sub-nav */}
        <nav aria-label="Seções de ajustes" className="flex flex-row gap-1 overflow-x-auto md:flex-col">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center justify-between gap-3 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-card text-foreground font-medium"
                    : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
                )}
              >
                <span>{item.label}</span>
                {item.badge && (
                  <span className="text-[0.625rem] font-semibold uppercase tracking-wider text-secondary">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Conteúdo */}
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
