import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { BRAND, TRIAL_DURATION_DAYS } from "@/lib/constants";
import { useAuth } from "@/features/auth/AuthProvider";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${BRAND.name} · ${BRAND.tagline}` },
      { name: "description", content: BRAND.description },
      { property: "og:title", content: `${BRAND.name} · ${BRAND.tagline}` },
      { property: "og:description", content: BRAND.description },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();
  // Destino do CTA principal muda se a pessoa já está logada
  const primaryCtaTo = isAuthenticated ? "/dashboard" : "/signup";
  const primaryCtaLabel = isAuthenticated
    ? "Abrir meu painel"
    : `Começar avaliação de ${TRIAL_DURATION_DAYS} dias`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Logo size="sm" />
          <nav className="flex items-center gap-6 text-sm">
            {!isLoading && !isAuthenticated && (
              <Link
                to="/login"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Entrar
              </Link>
            )}
            <Link
              to={primaryCtaTo}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {isAuthenticated ? "Painel" : "Começar"}
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero — proporção 60% Cream (fundo) / 30% Navy (tipo) / 10% Sage (acento) */}
      <main>
        <section className="mx-auto max-w-4xl px-6 py-24 text-center md:py-32">
          <Eyebrow tone="mauve">Built for CBT clinicians · Adolescents & adults</Eyebrow>

          <h1 className="mt-6 font-display text-5xl text-foreground md:text-7xl">
            Therapeutic tools <br className="hidden md:block" />
            your clients actually finish.
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Dynamic, evidence-based CBT activities you can run live in session
            or send home with a single link — no patient login required.
            Every activity generates clinical signal you can use to track and
            defend treatment progress.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              to={primaryCtaTo}
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {isAuthenticated ? "Open my workspace" : `Start ${TRIAL_DURATION_DAYS}-day trial`}
            </Link>
            {!isAuthenticated && (
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-md border border-border bg-background px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                I already have an account
              </Link>
            )}
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            No card required · Cancel anytime
          </p>
        </section>

        {/* Pilares (proporção visual mantém Cream dominante) */}
        <section className="border-t border-border/60 bg-card/40">
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-12 px-6 py-20 md:grid-cols-3">
            <div>
              <Eyebrow>01 · Built around the clinician</Eyebrow>
              <h3 className="mt-3 font-display text-xl text-foreground">
                Use it in session, or send it home.
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Run an activity live with your client, prescribe it as homework,
                or both. The session adapts to your practice — not the other way around.
              </p>
            </div>
            <div>
              <Eyebrow>02 · Activities clients finish</Eyebrow>
              <h3 className="mt-3 font-display text-xl text-foreground">
                Dynamic. Visual. Grounded in CBT.
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Not another printable PDF. Each activity is built on a specific
                cognitive model — engagement is the outcome, not a side effect.
              </p>
            </div>
            <div>
              <Eyebrow>03 · Clinical signal you can defend</Eyebrow>
              <h3 className="mt-3 font-display text-xl text-foreground">
                Every activity becomes a record.
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Patterns, intensity shifts, CBT concepts touched — auto-summarized
                into a report you can keep, export, or attach to your existing EHR.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 text-xs text-muted-foreground">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p>© {new Date().getFullYear()} {BRAND.name}. Built by a practicing CBT clinician.</p>
            <p className="font-medium">{BRAND.tagline}</p>
          </div>
          <div className="border-t border-border/40 pt-4 text-center sm:text-left">
            <p>TLS 1.3 in transit · AES-GCM-256 at rest · Built to support HIPAA compliance</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
