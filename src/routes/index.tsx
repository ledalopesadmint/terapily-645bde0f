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

        {/* Validated assessments — pilar próprio de feature */}
        <section className="border-t border-border/60">
          <div className="mx-auto max-w-4xl px-6 py-24 text-center">
            <Eyebrow tone="sage">Validated assessments · Built in</Eyebrow>
            <h2 className="mt-6 font-display text-4xl text-foreground md:text-5xl">
              The scales you already use. <br className="hidden md:block" />
              Scored for you.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
              35 evidence-based screening tools — PHQ-9, GAD-7, PCL-5 and many more —
              delivered as interactive quizzes with auto-scoring, severity bands,
              and a one-page report. No spreadsheets. No manual math. No licensing
              fees passed to you.
            </p>

            <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-6 text-left sm:grid-cols-4">
              <div>
                <p className="font-display text-3xl text-foreground">35</p>
                <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">Validated scales</p>
              </div>
              <div>
                <p className="font-display text-3xl text-foreground">$0</p>
                <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">Per-assessment fees</p>
              </div>
              <div>
                <p className="font-display text-3xl text-foreground">&lt;3s</p>
                <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">Score to report</p>
              </div>
              <div>
                <p className="font-display text-3xl text-foreground">100%</p>
                <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">Original wording preserved</p>
              </div>
            </div>

            <details className="group mx-auto mt-12 max-w-3xl rounded-lg border border-border/60 bg-card/40 text-left">
              <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-5 text-sm font-medium text-foreground transition-colors hover:bg-muted/40">
                <span>See the full library of 35 auto-scored assessments</span>
                <span className="text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true">▾</span>
              </summary>
              <div className="space-y-8 border-t border-border/40 px-6 py-8">
                <ScaleCategory
                  title="Depression & Mood"
                  scales={[
                    { code: "PHQ-9", name: "Patient Health Questionnaire", items: 9 },
                    { code: "PHQ-2", name: "Ultra-brief depression screen", items: 2 },
                    { code: "CES-D", name: "Center for Epidemiologic Studies Depression", items: 20 },
                    { code: "EPDS", name: "Edinburgh Postnatal Depression", items: 10 },
                    { code: "MDQ", name: "Mood Disorder Questionnaire (bipolar)", items: 13 },
                  ]}
                />
                <ScaleCategory
                  title="Anxiety"
                  scales={[
                    { code: "GAD-7", name: "Generalized Anxiety Disorder", items: 7 },
                    { code: "GAD-2", name: "Ultra-brief anxiety screen", items: 2 },
                    { code: "PSWQ", name: "Penn State Worry Questionnaire", items: 16 },
                    { code: "SPIN", name: "Social Phobia Inventory", items: 17 },
                    { code: "PDSS", name: "Panic Disorder Severity Scale", items: 7 },
                  ]}
                />
                <ScaleCategory
                  title="Trauma & PTSD"
                  scales={[
                    { code: "PCL-5", name: "PTSD Checklist for DSM-5 (VA standard)", items: 20 },
                    { code: "PC-PTSD-5", name: "Primary Care PTSD Screen", items: 5 },
                    { code: "IES-R", name: "Impact of Event Scale — Revised", items: 22 },
                    { code: "ACE", name: "Adverse Childhood Experiences", items: 10 },
                  ]}
                />
                <ScaleCategory
                  title="Substance Use"
                  scales={[
                    { code: "AUDIT", name: "Alcohol Use Disorders Identification (WHO)", items: 10 },
                    { code: "AUDIT-C", name: "AUDIT short form", items: 3 },
                    { code: "DAST-10", name: "Drug Abuse Screening Test", items: 10 },
                    { code: "CAGE", name: "Classic alcohol screen", items: 4 },
                    { code: "Fagerström", name: "Nicotine dependence", items: 6 },
                  ]}
                />
                <ScaleCategory
                  title="OCD & Compulsions"
                  scales={[
                    { code: "OCI-R", name: "Obsessive-Compulsive Inventory — Revised", items: 18 },
                    { code: "Y-BOCS", name: "Yale-Brown OCD Severity Scale", items: 10 },
                  ]}
                />
                <ScaleCategory
                  title="Eating"
                  scales={[
                    { code: "EAT-26", name: "Eating Attitudes Test", items: 26 },
                    { code: "SCOFF", name: "Brief eating disorder screen", items: 5 },
                  ]}
                />
                <ScaleCategory
                  title="Sleep"
                  scales={[
                    { code: "PSQI", name: "Pittsburgh Sleep Quality Index", items: 19 },
                    { code: "ISI", name: "Insomnia Severity Index", items: 7 },
                    { code: "Epworth", name: "Daytime Sleepiness Scale", items: 8 },
                  ]}
                />
                <ScaleCategory
                  title="Wellbeing & Functioning"
                  scales={[
                    { code: "WHO-5", name: "WHO Wellbeing Index", items: 5 },
                    { code: "SWLS", name: "Satisfaction With Life Scale", items: 5 },
                    { code: "WSAS", name: "Work & Social Adjustment Scale", items: 5 },
                    { code: "K10", name: "Kessler Psychological Distress", items: 10 },
                    { code: "DASS-21", name: "Depression Anxiety Stress Scale", items: 21 },
                  ]}
                />
                <ScaleCategory
                  title="CBT-Specific (track mechanism, not just symptoms)"
                  scales={[
                    { code: "ATQ-30", name: "Automatic Thoughts Questionnaire", items: 30 },
                    { code: "AAQ-II", name: "Acceptance & Action Questionnaire (ACT)", items: 7 },
                    { code: "CFQ", name: "Cognitive Fusion Questionnaire (ACT)", items: 7 },
                    { code: "SCS-SF", name: "Self-Compassion Scale — Short", items: 12 },
                  ]}
                />
                <p className="border-t border-border/40 pt-6 text-xs leading-relaxed text-muted-foreground">
                  Every assessment is delivered with original validated wording,
                  full attribution to its authors, and a clear disclaimer that
                  results are screening indicators — never diagnostic conclusions.
                  Clinical judgment always belongs to you.
                </p>
              </div>
            </details>
          </div>
        </section>

        {/* Pricing — 2 planos honestos. Practice destacado. Sem founding, sem social proof inventado. */}
        <section className="border-t border-border/60 bg-card/40">
          <div className="mx-auto max-w-5xl px-6 py-24">
            <div className="text-center">
              <Eyebrow tone="sage">Pricing · Two plans, no surprises</Eyebrow>
              <h2 className="mt-6 font-display text-4xl text-foreground md:text-5xl">
                Built to last. Priced like it.
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
                Same security baseline on every plan. Practice adds the
                governance layer solo clinicians grow into.
              </p>
            </div>

            <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Basic */}
              <div className="flex flex-col rounded-xl border border-border/60 bg-background p-8">
                <Eyebrow>Basic</Eyebrow>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-display text-5xl text-foreground">$69</span>
                  <span className="text-sm text-muted-foreground">/ month</span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Solo clinician getting started.
                </p>
                <ul className="mt-8 space-y-3 text-sm text-foreground">
                  <PricingItem>Up to 20 active patients</PricingItem>
                  <PricingItem>1 clinician</PricingItem>
                  <PricingItem>35 auto-scored validated assessments</PricingItem>
                  <PricingItem>Magic link delivery — no patient login</PricingItem>
                  <PricingItem>AES-GCM-256 at rest · TLS 1.3 in transit</PricingItem>
                  <PricingItem>Append-only audit log</PricingItem>
                  <PricingItem>Default retention policy (workspace-wide)</PricingItem>
                </ul>
                <Link
                  to={primaryCtaTo}
                  className="mt-10 inline-flex items-center justify-center rounded-md border border-border bg-background px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  {isAuthenticated ? "Open my workspace" : `Start ${TRIAL_DURATION_DAYS}-day trial`}
                </Link>
              </div>

              {/* Practice — destacado */}
              <div className="relative flex flex-col rounded-xl border-2 border-primary bg-background p-8 shadow-lg md:scale-[1.02]">
                <span className="absolute -top-3 left-8 rounded-full bg-primary px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary-foreground">
                  Most chosen
                </span>
                <Eyebrow tone="sage">Practice</Eyebrow>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-display text-5xl text-foreground">$159</span>
                  <span className="text-sm text-muted-foreground">/ month</span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Established practice that needs governance.
                </p>
                <ul className="mt-8 space-y-3 text-sm text-foreground">
                  <PricingItem>Up to 50 active patients</PricingItem>
                  <PricingItem>1 clinician (read-only supervision coming)</PricingItem>
                  <PricingItem>Everything in Basic</PricingItem>
                  <PricingItem>Encrypted session notes</PricingItem>
                  <PricingItem>Integrated scheduling</PricingItem>
                  <PricingItem>Two-factor authentication (TOTP)</PricingItem>
                  <PricingItem>
                    Configurable retention policy with state &amp; minor overrides
                  </PricingItem>
                  <PricingItem>
                    Exportable compliance report — retention policy, audit
                    trail, subprocessor BAAs, automated purge log
                  </PricingItem>
                </ul>
                <Link
                  to={primaryCtaTo}
                  className="mt-10 inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  {isAuthenticated ? "Open my workspace" : `Start ${TRIAL_DURATION_DAYS}-day trial`}
                </Link>
              </div>
            </div>

            <p className="mx-auto mt-10 max-w-3xl text-center text-xs leading-relaxed text-muted-foreground">
              No card required to start · Cancel anytime · Prices in USD ·
              Multi-clinician (Clinic) plan in development.
            </p>

            <p className="mx-auto mt-4 max-w-3xl text-center text-xs leading-relaxed text-muted-foreground">
              The compliance report aggregates your existing data into a
              format you can share with your auditor or attorney. It is not a
              certification, not a substitute for legal review, and not a
              guarantee of HIPAA compliance — that responsibility remains
              with each Covered Entity.
            </p>
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

interface Scale {
  code: string;
  name: string;
  items: number;
}

function ScaleCategory({ title, scales }: { title: string; scales: Scale[] }) {
  return (
    <div>
      <Eyebrow>{title}</Eyebrow>
      <ul className="mt-4 divide-y divide-border/40">
        {scales.map((scale) => (
          <li
            key={scale.code}
            className="flex items-baseline justify-between gap-4 py-3 text-sm"
          >
            <div className="min-w-0">
              <span className="font-medium text-foreground">{scale.code}</span>
              <span className="ml-3 text-muted-foreground">{scale.name}</span>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {scale.items} items
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PricingItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
        aria-hidden="true"
      />
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}

