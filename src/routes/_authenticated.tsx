import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/_authenticated")({
  // Auth check é client-side: a sessão Supabase vive no localStorage do browser.
  // beforeLoad não roda no SSR de forma confiável aqui — fazemos o gate no
  // componente. Importante: NÃO usamos localStorage no primeiro render pra
  // evitar hydration mismatch — a checagem síncrona acontece em useState
  // initializer só no cliente (após hidratação).
  component: AuthenticatedLayout,
});

/**
 * Checagem síncrona (apenas no cliente) de sessão persistida no localStorage.
 * Chamada DENTRO de useState/useEffect — nunca no caminho de render do SSR.
 */
function readPersistedSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
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
    /* localStorage indisponível em modo privado */
  }
  return false;
}

function AuthenticatedLayout() {
  const auth = useAuth();
  const navigate = useNavigate();

  // Hydration-safe: começa "desconhecido" e só checa após mount no cliente.
  // Isso garante que SSR e primeiro render do cliente produzem o mesmo HTML.
  const [persistedChecked, setPersistedChecked] = useState(false);
  const [hasPersisted, setHasPersisted] = useState(false);

  useEffect(() => {
    setHasPersisted(readPersistedSession());
    setPersistedChecked(true);
  }, []);

  // Critério de redirect:
  // - Auth já validou e está deslogado → /login
  // - Auth ainda carregando MAS já checamos localStorage e não há token → /login
  const shouldRedirect =
    (!auth.isLoading && !auth.isAuthenticated) ||
    (auth.isLoading && persistedChecked && !hasPersisted);

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
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
        <p className="eyebrow text-muted-foreground">Um momento</p>
        {auth.isSlowLoading && (
          <>
            <p className="text-sm text-muted-foreground max-w-sm text-center">
              Estamos carregando sua área com segurança. Isso pode levar alguns
              segundos após atualizações do sistema.
            </p>
            <button
              onClick={() => auth.retryHydration()}
              className="mt-2 inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Tentar novamente
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
