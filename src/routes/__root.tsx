import { useEffect } from "react";
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
import { initPwaInstallTracker } from "@/features/analytics/pwa-install-tracker";

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
      { title: "Terapily — Therapeutic tools your clients actually finish." },
      {
        name: "description",
        content:
          "CBT activities and validated scales (PHQ-9, GAD-7, PCL-5…) — auto-scored, sent by magic link, exportable to your EHR. HIPAA-aligned, BAA on request.",
      },
      { name: "keywords", content: "CBT tools, validated scales, PHQ-9, GAD-7, therapy homework, magic link, HIPAA, audit trail, EHR export, therapist software" },
      { name: "author", content: "Terapily" },
      { name: "theme-color", content: "#1F2A36" },
      { name: "robots", content: "index, follow" },
      // Open Graph
      { property: "og:site_name", content: "Terapily" },
      {
        property: "og:title",
        content: "Terapily — Therapeutic tools your clients actually finish.",
      },
      {
        property: "og:description",
        content:
          "CBT activities and validated scales (PHQ-9, GAD-7, PCL-5…) — auto-scored, sent by magic link, exportable to your EHR. HIPAA-aligned, BAA on request.",
      },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "en_US" },
      { property: "og:image", content: "https://www.terapily.com/og-image.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Terapily — therapeutic tools your clients actually finish" },
      // Twitter
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "Terapily — Therapeutic tools your clients actually finish.",
      },
      {
        name: "twitter:description",
        content:
          "CBT activities and validated scales — auto-scored, sent by magic link, exportable to your EHR. HIPAA-aligned, BAA on request.",
      },
      { name: "twitter:image", content: "https://www.terapily.com/og-image.png" },
      { name: "twitter:image:alt", content: "Terapily — therapeutic tools your clients actually finish" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      // Favicons
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
      { rel: "icon", type: "image/png", sizes: "96x96", href: "/favicon-96x96.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/site.webmanifest" },
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
