import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
} from "@tanstack/react-router";
import { useAuth } from "@/features/auth/AuthProvider";
import { Logo } from "@/components/brand/Logo";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ context, location }) => {
    // CRITICAL: usamos auth do contexto setado pelo router (ver router.tsx).
    // Se ainda está carregando, deixamos passar e o componente trata.
    if (context.auth && !context.auth.isLoading && !context.auth.isAuthenticated) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const auth = useAuth();

  // Loading guard: enquanto sessão hidrata, evita flash.
  if (auth.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="eyebrow text-muted-foreground">Um momento</p>
      </div>
    );
  }

  // Se beforeLoad não pegou (race), client-side fallback.
  if (!auth.isAuthenticated) {
    return null;
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
