import { createRouter, useRouter } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { routeTree } from "./routeTree.gen";

function DefaultErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="eyebrow">Algo não funcionou</p>
        <h1 className="mt-3 font-display text-4xl text-foreground">
          Um momento — vamos tentar de novo.
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Se persistir, recarregue a página ou volte ao início.
        </p>
        {import.meta.env.DEV && error.message && (
          <pre className="mt-6 max-h-40 overflow-auto rounded-md bg-muted p-3 text-left font-mono text-xs text-destructive">
            {error.message}
          </pre>
        )}
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Voltar pro início
          </a>
        </div>
      </div>
    </div>
  );
}

export const getRouter = () => {
  // CRITICAL: QueryClient é criado dentro de getRouter (não singleton no module-level)
  // pra evitar leak de cache entre requests SSR.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1min
        refetchOnWindowFocus: false,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: DefaultErrorComponent,
  });

  return router;
};
