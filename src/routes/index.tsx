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
          <Eyebrow tone="mauve">Para psicólogos · Construído por uma clínica</Eyebrow>

          <h1 className="mt-6 font-display text-5xl text-foreground md:text-7xl">
            Onde começa <br className="hidden md:block" />
            uma terapia melhor.
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            <em className="font-display">Terapily</em> é o sistema silencioso
            por trás do trabalho clínico — atividades, jogos terapêuticos e
            fluxo de homework para psicólogos TCC. Pensado dentro da sessão,
            não dentro do backlog.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              to={primaryCtaTo}
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {primaryCtaLabel}
            </Link>
            {!isAuthenticated && (
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-md border border-border bg-background px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Já tenho conta
              </Link>
            )}
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Sem cobrança automática · Cancele a qualquer momento
          </p>
        </section>

        {/* Pilares (proporção visual mantém Cream dominante) */}
        <section className="border-t border-border/60 bg-card/40">
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-12 px-6 py-20 md:grid-cols-3">
            <div>
              <Eyebrow>01 · Construído por uma clínica</Eyebrow>
              <h3 className="mt-3 font-display text-xl text-foreground">
                Todo fluxo nasce dentro da sessão.
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Cada decisão começa pela cadeira do terapeuta — não pelo backlog.
              </p>
            </div>
            <div>
              <Eyebrow>02 · Atividades que engajam</Eyebrow>
              <h3 className="mt-3 font-display text-xl text-foreground">
                Interativas, belas, imprimíveis.
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Pacientes voltam a elas. Engajamento é desfecho clínico.
              </p>
            </div>
            <div>
              <Eyebrow>03 · Privacidade como postura</Eyebrow>
              <h3 className="mt-3 font-display text-xl text-foreground">
                Dado clínico é sagrado.
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Tratamento ponta-a-ponta — não checkbox. Por padrão.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs text-muted-foreground sm:flex-row">
          <p>
            © {new Date().getFullYear()} {BRAND.name}. Fundado por{" "}
            {BRAND.founder}.
          </p>
          <p className="font-medium">{BRAND.tagline}</p>
        </div>
      </footer>
    </div>
  );
}
