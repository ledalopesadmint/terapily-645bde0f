import {
  Outlet,
  Link,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/features/auth/AuthProvider";

import appCss from "../styles.css?url";

interface RouterContext {
  queryClient: QueryClient;
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="eyebrow">Erro 404</p>
        <h1 className="mt-3 font-display text-5xl text-foreground">
          Esta página ainda não existe.
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Talvez ela esteja por vir, ou você tenha seguido um link antigo.
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar pro início
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Terapily · Onde começa uma terapia melhor." },
      {
        name: "description",
        content:
          "Terapily é o sistema silencioso por trás de uma terapia melhor — atividades, jogos e fluxo clínico para psicólogos TCC.",
      },
      { name: "author", content: "Terapily" },
      { name: "theme-color", content: "#1F2A36" },
      {
        property: "og:title",
        content: "Terapily · Onde começa uma terapia melhor.",
      },
      {
        property: "og:description",
        content:
          "Atividades clínicas, jogos terapêuticos e fluxo de homework para psicólogos. Construído por uma clínica.",
      },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "pt_BR" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "Terapily · Onde começa uma terapia melhor." },
      { name: "twitter:title", content: "Terapily · Onde começa uma terapia melhor." },
      { name: "description", content: "Terapily MVP Builder is a platform for creating Minimum Viable Products." },
      { property: "og:description", content: "Terapily MVP Builder is a platform for creating Minimum Viable Products." },
      { name: "twitter:description", content: "Terapily MVP Builder is a platform for creating Minimum Viable Products." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/d2aff40b-0630-4708-9276-7284ca785da8/id-preview-6a70f4a2--7413e2c8-7654-4145-ab8e-263a6f0f0a33.lovable.app-1777297376752.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/d2aff40b-0630-4708-9276-7284ca785da8/id-preview-6a70f4a2--7413e2c8-7654-4145-ab8e-263a6f0f0a33.lovable.app-1777297376752.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      // Preconnect Google Fonts pra carregar Cormorant + Inter rápido
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,300;0,400;0,500;0,600;1,400;1,500&family=Inter:wght@300;400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
