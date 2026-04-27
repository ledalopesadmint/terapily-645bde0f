import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { Logo } from "@/components/brand/Logo";

export const Route = createFileRoute("/_authenticated")({
  // Auth check é client-side (sessão Supabase vive no localStorage do browser).
  // beforeLoad não consegue ler isso de forma confiável no SSR — fazemos no
  // componente com useAuth + useEffect pra evitar flash de conteúdo protegido.
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      void navigate({ to: "/login", replace: true });
    }
  }, [auth.isLoading, auth.isAuthenticated, navigate]);

  if (auth.isLoading || !auth.isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="eyebrow text-muted-foreground">Um momento</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/_authenticated/welcome" aria-label="Início">
            <Logo size="sm" />
          </Link>
          <div className="flex items-center gap-6">
            {auth.workspace && (
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {auth.workspace.name}
              </span>
            )}
            <button
              type="button"
              onClick={() => void auth.signOut()}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Sair
            </button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
