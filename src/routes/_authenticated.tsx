import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/_authenticated")({
  // Auth check é client-side: a sessão Supabase vive no localStorage do browser.
  // beforeLoad não roda no SSR de forma confiável aqui — fazemos o gate no
  // componente combinando: (1) checagem síncrona no primeiro paint pra evitar
  // flash de UI protegida e (2) useEffect pra reagir a expiração de sessão.
  component: AuthenticatedLayout,
});

/**
 * Checagem síncrona da sessão no localStorage (chave do Supabase JS v2).
 * Retorna true se HÁ token persistido — mesmo que ainda não validado.
 * Isso elimina o flash de "loading" pra usuários autenticados e evita
 * mostrar UI protegida pra quem não tem sessão.
 */
function hasPersistedSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // Supabase JS v2 usa a chave sb-<project-ref>-auth-token
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const raw = window.localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (parsed?.access_token && parsed?.refresh_token) return true;
      }
    }
  } catch {
    // localStorage pode falhar em modo privado — cai pro fluxo padrão
  }
  return false;
}

function AuthenticatedLayout() {
  const auth = useAuth();
  const navigate = useNavigate();

  // Gate imediato: se não há sessão persistida E não estamos carregando,
  // ou se já validamos e não está autenticado → /login
  const persisted = hasPersistedSession();
  const shouldRedirect =
    (!auth.isLoading && !auth.isAuthenticated) ||
    (auth.isLoading && !persisted);

  useEffect(() => {
    if (shouldRedirect) {
      void navigate({ to: "/login", replace: true });
    }
  }, [shouldRedirect, navigate]);

  if (shouldRedirect) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="eyebrow text-muted-foreground">Redirecionando</p>
      </div>
    );
  }

  if (auth.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="eyebrow text-muted-foreground">Um momento</p>
      </div>
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
