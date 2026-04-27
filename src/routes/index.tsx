import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  Brain,
  ScrollText,
  Compass,
  KeyRound,
  Sparkles,
  ArrowRight,
  Lock,
  Check,
  Minus,
  Activity,
  PenLine,
  Send,
  History,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { Reveal } from "@/components/brand/Reveal";
import { BRAND, TRIAL_DURATION_DAYS } from "@/lib/constants";
import { useAuth } from "@/features/auth/AuthProvider";

/**
 * Landing pública (sales page) — EN-US.
 *
 * Visual: alternância tonal (cream → sage tint → cream → navy → mauve tint),
 * ilustrações SVG inline, ícones Lucide coloridos, reveal-on-scroll.
 * Copy/posicionamento mantidos (ver mem://features/landing-copy-strategy).
 *
 * Marcadores `{/* IMG: ... *\/}` indicam onde podem entrar ilustrações
 * dedicadas no futuro (hero shot do board, mockup de PDF, fotos lifestyle).
 */

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title:
          "Terapily · Therapy your client helps build. Records you can defend.",
      },
      {
        name: "description",
        content:
          "Terapily turns each CBT session into a visual board you co-build with your client, then auto-generates a clinical report you can defend. PHI encrypted at rest. Audit-logged by default. BAA available. 14-day free trial.",
      },
      {
        property: "og:title",
        content:
          "Terapily · Therapy your client helps build. Records you can defend.",
      },
      {
        property: "og:description",
        content:
          "Visual CBT boards your client co-builds in session. Auto-generated clinical reports. Encrypted, audit-logged patient workspace. Built for clinicians treating adolescents and adults.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const primaryCtaTo = isAuthenticated ? "/dashboard" : "/signup";
  const primaryCtaLabel = isAuthenticated
    ? "Open my dashboard"
    : `Start your ${TRIAL_DURATION_DAYS}-day free trial`;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader
        isAuthenticated={isAuthenticated}
        isLoading={isLoading}
        primaryCtaTo={primaryCtaTo}
      />

      <main>
        <Hero
          primaryCtaTo={primaryCtaTo}
          primaryCtaLabel={primaryCtaLabel}
          isAuthenticated={isAuthenticated}
        />
        <TrustStrip />
        <Problem />
        <Solution />
        <WhereItFits />
        <Comparison />
        <SeeItWork />
        <Features />
        <Pricing primaryCtaTo={primaryCtaTo} />
        <Faq />
        <ClosingCta primaryCtaTo={primaryCtaTo} primaryCtaLabel={primaryCtaLabel} />
      </main>

      <SiteFooter />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Header / Footer                                                            */
/* -------------------------------------------------------------------------- */

function SiteHeader({
  isAuthenticated,
  isLoading,
  primaryCtaTo,
}: {
  isAuthenticated: boolean;
  isLoading: boolean;
  primaryCtaTo: "/dashboard" | "/signup";
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-[oklch(0.97_0.005_80_/_0.9)] backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Logo size="sm" />
        <nav className="flex items-center gap-6 text-sm">
          <a
            href="#pricing"
            className="hidden font-medium text-[var(--navy)]/70 transition-colors hover:text-[var(--navy)] sm:inline"
          >
            Pricing
          </a>
          <a
            href="#faq"
            className="hidden font-medium text-[var(--navy)]/70 transition-colors hover:text-[var(--navy)] sm:inline"
          >
            FAQ
          </a>
          {!isLoading && !isAuthenticated && (
            <Link
              to="/login"
              className="font-medium text-[var(--navy)]/70 transition-colors hover:text-[var(--navy)]"
            >
              Log in
            </Link>
          )}
          <Link
            to={primaryCtaTo}
            className="inline-flex items-center justify-center rounded-md bg-[var(--solar)] px-4 py-2 text-sm font-semibold text-[var(--navy)] shadow-sm transition-all hover:shadow-[var(--shadow-glow-solar)]"
          >
            {isAuthenticated ? "Dashboard" : "Start free trial"}
          </Link>
        </nav>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border/40 bg-[var(--surface-cream-deep)]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 text-xs text-muted-foreground sm:flex-row">
        <p>
          © {new Date().getFullYear()} {BRAND.name}, Inc. PHI encrypted at rest. BAA available.
        </p>
        <div className="flex items-center gap-6">
          <Link
            to="/trust"
            className="transition-colors hover:text-foreground"
          >
            Trust &amp; Security
          </Link>
          <p className="font-display italic text-foreground/70">Where better therapy begins.</p>
        </div>
      </div>
    </footer>
  );
}

/* -------------------------------------------------------------------------- */
/* 01 · Hero — gradient orgânico + cards flutuando                            */
/* -------------------------------------------------------------------------- */

function Hero({
  primaryCtaTo,
  primaryCtaLabel,
  isAuthenticated,
}: {
  primaryCtaTo: "/dashboard" | "/signup";
  primaryCtaLabel: string;
  isAuthenticated: boolean;
}) {
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "var(--gradient-hero)" }}
    >
      {/* Blobs decorativos — ciano + lavanda + lima */}
      <div
        aria-hidden
        className="blob-drift pointer-events-none absolute -left-24 top-32 h-72 w-72 rounded-full opacity-50 blur-3xl"
        style={{ background: "oklch(0.71 0.13 220 / 0.55)" }}
      />
      <div
        aria-hidden
        className="blob-drift pointer-events-none absolute -right-20 top-10 h-64 w-64 rounded-full opacity-40 blur-3xl"
        style={{ background: "oklch(0.62 0.21 290 / 0.45)", animationDelay: "-7s" }}
      />
      <div
        aria-hidden
        className="blob-drift pointer-events-none absolute bottom-0 left-1/3 h-56 w-56 rounded-full opacity-35 blur-3xl"
        style={{ background: "oklch(0.87 0.2 130 / 0.4)", animationDelay: "-4s" }}
      />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 py-20 md:py-28 lg:grid-cols-12 lg:gap-8">
        {/* Coluna esquerda — copy */}
        <div className="lg:col-span-7">
          <Reveal>
            <Eyebrow tone="mauve">
              Built for CBT clinicians treating adolescents &amp; adults
            </Eyebrow>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="mt-6 font-display text-5xl text-[var(--cream)] md:text-6xl lg:text-[4.5rem]">
              Therapy your client{" "}
              <span className="relative inline-block">
                <span className="relative z-10">helps build.</span>
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-1 h-3 rounded-sm"
                  style={{ background: "oklch(0.86 0.17 90 / 0.6)" }}
                />
              </span>{" "}
              Records you can{" "}
              <span className="relative inline-block">
                <span className="relative z-10">defend.</span>
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-1 h-3 rounded-sm"
                  style={{ background: "oklch(0.87 0.2 130 / 0.55)" }}
                />
              </span>
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="mt-8 max-w-xl text-base leading-relaxed text-[var(--cream)]/75 md:text-lg">
              <em className="font-display not-italic text-[var(--cream)]">Terapily</em> turns each CBT
              session into a visual board you co-build with your client, then auto-generates a
              clean clinical report you can attach to the chart, share with families, or hand to
              your supervisor.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row">
              <Link
                to={primaryCtaTo}
                className="group inline-flex items-center justify-center gap-2 rounded-md bg-[var(--solar)] px-6 py-3 text-sm font-semibold text-[var(--navy)] shadow-[var(--shadow-card-lift)] transition-all hover:shadow-[var(--shadow-glow-solar)]"
              >
                {primaryCtaLabel}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              {!isAuthenticated && (
                <a
                  href="#see-it-work"
                  className="inline-flex items-center justify-center rounded-md border border-[var(--cream)]/25 bg-[var(--cream)]/5 px-6 py-3 text-sm font-medium text-[var(--cream)] backdrop-blur transition-colors hover:bg-[var(--cream)]/10"
                >
                  See how it works
                </a>
              )}
            </div>
          </Reveal>

          <Reveal delay={320}>
            <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--cream)]/65">
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-[var(--lime)]" /> No credit card
              </span>
              <span className="text-[var(--cream)]/30">·</span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-[var(--lime)]" /> Cancel anytime
              </span>
              <span className="text-[var(--cream)]/30">·</span>
              <span className="inline-flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-[var(--sage)]" /> BAA available on Practice
              </span>
            </p>
          </Reveal>
        </div>

        {/* Coluna direita — ilustração: board mockup empilhado */}
        <div className="relative lg:col-span-5">
          <Reveal variant="scale" delay={200}>
            <HeroIllustration />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function HeroIllustration() {
  const cards = [
    { label: "Situation", color: "oklch(0.65 0.04 152)", h: 38 },
    { label: "Thought", color: "oklch(0.7 0.04 0)", h: 56 },
    { label: "Emotion", color: "oklch(0.78 0.11 50)", h: 70 },
    { label: "Body", color: "oklch(0.65 0.04 152 / 0.7)", h: 44 },
    { label: "Behavior", color: "oklch(0.7 0.04 0 / 0.85)", h: 60 },
  ];

  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* Card empilhado atrás (PDF report) */}
      <div
        className="absolute -bottom-6 -right-4 hidden h-72 w-64 rotate-[6deg] rounded-xl border border-border/60 bg-[var(--card)] p-4 shadow-[var(--shadow-card-soft)] sm:block float-slow"
        style={{ animationDelay: "-3s" }}
        aria-hidden
      >
        <div className="flex items-center justify-between">
          <div className="h-2 w-16 rounded-sm bg-primary/80" />
          <div className="h-2 w-8 rounded-sm bg-secondary" />
        </div>
        <div className="mt-3 space-y-1.5">
          <div className="h-1.5 w-3/4 rounded-sm bg-foreground/30" />
          <div className="h-1.5 w-full rounded-sm bg-foreground/15" />
          <div className="h-1.5 w-5/6 rounded-sm bg-foreground/15" />
          <div className="h-1.5 w-4/6 rounded-sm bg-foreground/15" />
        </div>
        <div className="mt-4 grid grid-cols-5 gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 rounded-sm bg-secondary/20" />
          ))}
        </div>
      </div>

      {/* Card principal — board CBT */}
      <div className="relative rounded-xl border border-border/60 bg-[var(--card)] p-5 shadow-[var(--shadow-card-lift)] float-slow">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[oklch(0.78_0.11_50)]" />
            <div className="h-2 w-2 rounded-full bg-[oklch(0.7_0.04_0)]" />
            <div className="h-2 w-2 rounded-full bg-secondary" />
          </div>
          <span className="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Anxiety Loop · Apr 27
          </span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {cards.map((c, i) => (
            <div key={c.label} className="flex flex-col gap-1.5">
              <span
                className="text-[0.5rem] font-bold uppercase tracking-wider text-foreground/70"
                title={c.label}
              >
                {c.label.slice(0, 4)}
              </span>
              <div
                className="rounded-md transition-all"
                style={{
                  height: `${c.h + 30}px`,
                  background: c.color,
                  animation: `pulse-soft 4s ease-in-out infinite ${i * 0.4}s`,
                }}
              />
              <div
                className="h-3 rounded-sm bg-foreground/10"
                style={{ width: `${50 + (i % 3) * 15}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between rounded-md bg-secondary/15 px-3 py-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-secondary-foreground" />
            <span className="text-[0.65rem] font-medium text-secondary-foreground">
              Generate clinical report
            </span>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-secondary-foreground" />
        </div>
      </div>

      {/* Badge "encrypted" flutuante */}
      <div
        className="absolute -left-6 -top-4 hidden items-center gap-1.5 rounded-full border border-border/60 bg-[var(--card)] px-3 py-1.5 shadow-[var(--shadow-card-soft)] sm:inline-flex float-slow"
        style={{ animationDelay: "-2s" }}
      >
        <Lock className="h-3 w-3 text-secondary" />
        <span className="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-foreground">
          AES-256 · audit-logged
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 02 · Trust strip — 5 pilares com ícones coloridos                          */
/* -------------------------------------------------------------------------- */

const PILLARS = [
  {
    n: "01",
    title: "Encrypted by design",
    body: "PHI encrypted at rest with AES-GCM-256. Per-workspace isolation enforced at the database level.",
    Icon: ShieldCheck,
    tint: "oklch(0.65 0.04 152 / 0.18)",
    iconColor: "oklch(0.45 0.06 152)",
  },
  {
    n: "02",
    title: "CBT, not generic forms",
    body: "Built around Beck's cognitive model and the 5-component structure clinicians actually use in session.",
    Icon: Brain,
    tint: "oklch(0.7 0.04 0 / 0.18)",
    iconColor: "oklch(0.45 0.07 0)",
  },
  {
    n: "03",
    title: "Audit-ready",
    body: "Every read, every edit, every export — logged with timestamp and user. Export the trail anytime.",
    Icon: ScrollText,
    tint: "oklch(0.78 0.11 50 / 0.2)",
    iconColor: "oklch(0.5 0.13 45)",
  },
  {
    n: "04",
    title: "Boring on purpose",
    body: "Stable interface. Predictable updates. The workflow you learn this week works the same in year three.",
    Icon: Compass,
    tint: "oklch(0.22 0.02 232 / 0.12)",
    iconColor: "oklch(0.22 0.02 232)",
  },
  {
    n: "05",
    title: "Yours to own",
    body: "Export your full patient archive anytime. No lock-in. Your data leaves with you.",
    Icon: KeyRound,
    tint: "oklch(0.65 0.04 152 / 0.18)",
    iconColor: "oklch(0.45 0.06 152)",
  },
] as const;

function TrustStrip() {
  return (
    <section className="border-y border-border/40 bg-[var(--surface-cream-deep)]">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {PILLARS.map((p, i) => {
            const { Icon } = p;
            return (
              <Reveal key={p.n} delay={i * 70}>
                <div className="flex flex-col gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{ background: p.tint }}
                  >
                    <Icon className="h-5 w-5" style={{ color: p.iconColor }} />
                  </div>
                  <Eyebrow tone="sage">
                    {p.n} · {p.title}
                  </Eyebrow>
                  <p className="text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 03 · Problem — fundo cream com ilustração lateral sutil                    */
/* -------------------------------------------------------------------------- */

function Problem() {
  return (
    <section className="relative overflow-hidden bg-background">
      {/* Acento decorativo: linha quebrada (representa "fragmentação") */}
      <svg
        aria-hidden
        className="pointer-events-none absolute right-0 top-1/2 hidden h-64 w-64 -translate-y-1/2 opacity-[0.07] md:block"
        viewBox="0 0 200 200"
      >
        <path
          d="M10 100 L60 100 L60 40 L120 40 L120 160 L190 160"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeDasharray="6 4"
        />
      </svg>

      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <Reveal>
          <Eyebrow>The quiet problem</Eyebrow>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="mt-4 font-display text-4xl text-foreground md:text-5xl">
            Between sessions,{" "}
            <span className="italic text-[oklch(0.5_0.13_45)]">the work disappears.</span>
          </h2>
        </Reveal>
        <Reveal delay={160}>
          <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            You finish a 50-minute session. Your client leaves with a worksheet, a homework idea,
            and the best of intentions. Two weeks later they&rsquo;re back — and you spend the
            first 15 minutes reconstructing what should have happened in between.
          </p>
        </Reveal>
        <Reveal delay={220}>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Meanwhile, your notes live in three places. The session board lives on a whiteboard
            you photographed. The homework lives in a worksheet you may never see again. And if
            anyone — a supervisor, an auditor, a board — ever asks for the thread, you have to
            assemble it from memory.
          </p>
        </Reveal>
        <Reveal delay={300}>
          <p className="mx-auto mt-10 max-w-xl border-l-4 border-secondary bg-secondary/8 px-6 py-4 text-left font-display text-2xl italic text-foreground">
            That&rsquo;s not a documentation problem. That&rsquo;s a clinical continuity problem.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 04 · Solution — 4 fases com ícones, fundo sage tint                        */
/* -------------------------------------------------------------------------- */

const SOLUTION_PHASES = [
  {
    n: "In session",
    title: "Co-build the board, live.",
    body: "Drag situation → thought → emotion → body → behavior cards onto a shared canvas. Pull from a clinically authored CBT vocabulary deck. Your client watches their own pattern emerge — and leaves the session with something they helped build.",
    Icon: PenLine,
    accent: "oklch(0.65 0.04 152)",
  },
  {
    n: "End of session",
    title: "One click. One report.",
    body: "A clean clinical report — pre-interpreted summary on top, full board below. Export as branded PDF or save to the patient's encrypted record. Ready before your client closes the door.",
    Icon: Sparkles,
    accent: "oklch(0.78 0.11 50)",
  },
  {
    n: "Between sessions",
    title: "Continue the work, securely.",
    body: "Send a magic link your client opens on any device. They continue the homework. You see their progress before the next session. No app install. No password reset emails at 11pm.",
    Icon: Send,
    accent: "oklch(0.7 0.04 0)",
  },
  {
    n: "Next session",
    title: "Open at the line where you left off.",
    body: "The patient record opens with the full thread already there. Last board, last notes, last homework status. No reconstruction. No 'remind me where we were.'",
    Icon: History,
    accent: "oklch(0.22 0.02 232)",
  },
] as const;

function Solution() {
  return (
    <section
      id="solution"
      className="relative overflow-hidden border-y border-border/40"
      style={{ background: "var(--gradient-sage-soft)" }}
    >
      <div className="relative mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <Eyebrow tone="sage">The Terapily flow</Eyebrow>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="mt-4 font-display text-4xl text-foreground md:text-5xl">
              One board. One report. <br className="hidden md:block" />
              <span className="italic">One encrypted thread.</span>
            </h2>
          </Reveal>
        </div>

        <ol className="mt-16 grid gap-6 md:grid-cols-2 md:gap-8">
          {SOLUTION_PHASES.map((phase, i) => {
            const { Icon } = phase;
            return (
              <Reveal as="li" key={phase.n} delay={i * 100}>
                <div className="group relative h-full rounded-2xl border border-border/40 bg-background/80 p-8 backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-card-lift)]">
                  <div
                    className="absolute -top-4 left-8 flex h-12 w-12 items-center justify-center rounded-xl shadow-[var(--shadow-card-soft)]"
                    style={{ background: phase.accent }}
                  >
                    <Icon className="h-5 w-5 text-cream" strokeWidth={2.2} />
                  </div>
                  <div className="mt-4 flex items-baseline gap-3">
                    <span className="font-display text-3xl text-foreground/30">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      {phase.n}
                    </span>
                  </div>
                  <h3 className="mt-2 font-display text-2xl text-foreground">{phase.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {phase.body}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 05 · Where it fits — fundo cream com SVG handshake                         */
/* -------------------------------------------------------------------------- */

function WhereItFits() {
  return (
    <section className="bg-background">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 md:grid-cols-2">
        <div>
          <Reveal>
            <Eyebrow>Where it fits</Eyebrow>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="mt-4 font-display text-4xl text-foreground md:text-5xl">
              Terapily doesn&rsquo;t replace your EHR.{" "}
              <span className="italic text-secondary-foreground">It does what your EHR can&rsquo;t.</span>
            </h2>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-8 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              Keep SimplePractice, TherapyNotes, or whatever you use for billing and scheduling.
              Use Terapily for the clinical work itself — the session, the homework, the thread
              between visits. Export reports as branded PDFs and attach them to your existing
              chart in seconds.
            </p>
          </Reveal>
          <Reveal delay={220}>
            <ul className="mt-8 space-y-2 text-sm text-muted-foreground">
              {[
                "No data migration",
                "No second login for your front desk",
                "No replacing the systems your practice already runs on",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-secondary" />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        {/* IMG: Substituir por ilustração editorial (handshake EHR ↔ Terapily) */}
        <Reveal variant="scale" delay={200}>
          <FitDiagram />
        </Reveal>
      </div>
    </section>
  );
}

function FitDiagram() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="grid grid-cols-2 gap-3">
        {/* EHR card */}
        <div className="rounded-xl border border-border/60 bg-[var(--surface-cream-deep)] p-5 shadow-[var(--shadow-card-soft)]">
          <span className="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Your EHR
          </span>
          <p className="mt-2 font-display text-base text-foreground">Billing · Scheduling · Intake</p>
          <div className="mt-4 space-y-1.5">
            <div className="h-1.5 w-full rounded-sm bg-foreground/15" />
            <div className="h-1.5 w-3/4 rounded-sm bg-foreground/15" />
            <div className="h-1.5 w-5/6 rounded-sm bg-foreground/15" />
          </div>
        </div>
        {/* Terapily card */}
        <div className="rounded-xl border-2 border-secondary bg-secondary/15 p-5 shadow-[var(--shadow-glow-sage)]">
          <span className="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-secondary-foreground">
            Terapily
          </span>
          <p className="mt-2 font-display text-base text-foreground">Session · Board · Report</p>
          <div className="mt-4 space-y-1.5">
            <div className="h-1.5 w-full rounded-sm bg-secondary/60" />
            <div className="h-1.5 w-5/6 rounded-sm bg-secondary/60" />
            <div className="h-1.5 w-3/4 rounded-sm bg-secondary/60" />
          </div>
        </div>
      </div>
      {/* Linha conectora */}
      <div className="mt-4 flex items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-background/50 px-4 py-3">
        <span className="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          PDF export
        </span>
        <ArrowRight className="h-3.5 w-3.5 text-secondary" />
        <span className="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Attach to chart
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 06 · Comparison — fundo mauve tint                                         */
/* -------------------------------------------------------------------------- */

const COMPARISON_ROWS = [
  ["Built for", "Billing & admin", "Note generation from audio", "Live clinical work"],
  [
    "What the client experiences",
    "PDF emailed, often ignored",
    "Client never sees it",
    "Client co-builds in session",
  ],
  [
    "What gets recorded",
    "Generic intake forms",
    "Transcript + AI summary",
    "Co-built CBT board + clinical report",
  ],
  ["Between-session work", "None", "None", "Secure magic-link homework"],
  [
    "PHI security model",
    "Stored, varies by vendor",
    "Audio + transcript stored",
    "Per-workspace, encrypted at rest, audit-logged",
  ],
  ["Setup time", "2–6 hours", "30 minutes", "Under 90 seconds"],
  ["Origin", "Generalist software", "AI-first, clinical-second", "Clinical-first, by design"],
] as const;

function Comparison() {
  return (
    <section
      className="border-y border-border/40"
      style={{ background: "var(--gradient-mauve-soft)" }}
    >
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <Eyebrow>Why Terapily</Eyebrow>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="mt-4 font-display text-4xl text-foreground md:text-5xl">
              Not the tools you&rsquo;ve <span className="italic">already tried.</span>
            </h2>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-6 text-base leading-relaxed text-muted-foreground">
              A direct comparison with the three categories most CBT clinicians are choosing
              between today.
            </p>
          </Reveal>
        </div>

        <Reveal delay={200}>
          <div className="mt-12 overflow-x-auto rounded-2xl border border-border/40 bg-background shadow-[var(--shadow-card-soft)]">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="bg-[var(--surface-cream-deep)]">
                  <th className="p-4 text-left font-medium text-muted-foreground"></th>
                  <th className="p-4 text-left font-medium text-muted-foreground">
                    Generic EHRs
                  </th>
                  <th className="p-4 text-left font-medium text-muted-foreground">
                    AI transcription
                  </th>
                  <th
                    className="p-4 text-left font-display text-base text-foreground"
                    style={{
                      background:
                        "linear-gradient(180deg, oklch(0.65 0.04 152 / 0.2), oklch(0.65 0.04 152 / 0.08))",
                      borderLeft: "4px solid var(--sage)",
                    }}
                  >
                    Terapily
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr
                    key={row[0]}
                    className={i % 2 === 0 ? "bg-background" : "bg-[var(--surface-cream-deep)]/40"}
                  >
                    <td className="p-4 font-medium text-foreground">{row[0]}</td>
                    <td className="p-4 text-muted-foreground">{row[1]}</td>
                    <td className="p-4 text-muted-foreground">{row[2]}</td>
                    <td
                      className="p-4 text-foreground"
                      style={{
                        background: "oklch(0.65 0.04 152 / 0.08)",
                        borderLeft: "4px solid var(--sage)",
                      }}
                    >
                      {row[3]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>

        <Reveal delay={280}>
          <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted-foreground">
            AI transcription tools listen to your session. Terapily builds a clinical artifact{" "}
            <em className="font-display not-italic text-foreground">with</em> your client — and
            the report is a byproduct of the work, not the product itself.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 07 · See it work — fundo navy com gradiente                                */
/* -------------------------------------------------------------------------- */

const ARTIFACTS = [
  {
    label: "01 · The session board",
    title: "Drag-and-drop canvas",
    body: "5 categories, vocabulary deck, free-text. Built in session, with the client.",
    visual: "board" as const,
  },
  {
    label: "02 · The clinical report",
    title: "Branded PDF, in seconds",
    body: "Pre-interpreted summary on top. Full board below. Branded with your practice.",
    visual: "report" as const,
  },
  {
    label: "03 · The encrypted record",
    title: "One thread per patient",
    body: "Every board, every report, every homework — encrypted at rest, audit-logged.",
    visual: "record" as const,
  },
];

const FACTS = [
  { value: "< 90 sec", label: "to set up your first patient" },
  { value: "< 3 sec", label: "to generate a clinical report" },
  { value: "AES-GCM-256", label: "encryption standard at rest" },
  { value: "30 days", label: "soft-delete recovery window" },
  { value: "100%", label: "of access events written to audit log" },
] as const;

function SeeItWork() {
  return (
    <section
      id="see-it-work"
      className="relative overflow-hidden border-y border-border/40 text-cream"
      style={{ background: "var(--gradient-navy-glow)" }}
    >
      <div className="relative mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <Eyebrow tone="sage">What it actually looks like</Eyebrow>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="mt-4 font-display text-4xl md:text-5xl">
              A board, a report, a record. <br className="hidden md:block" />
              <span className="italic text-[oklch(0.85_0.05_152)]">That&rsquo;s the product.</span>
            </h2>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-6 text-base leading-relaxed text-cream/70">
              No demo call required. Three artifacts every session produces.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {ARTIFACTS.map((a, i) => (
            <Reveal as="article" key={a.label} delay={i * 100}>
              <div className="group h-full rounded-2xl border border-cream/10 bg-cream/5 p-6 backdrop-blur-sm transition-all hover:-translate-y-1 hover:bg-cream/8 hover:border-cream/20">
                <ArtifactVisual kind={a.visual} />
                <p className="mt-5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-secondary">
                  {a.label}
                </p>
                <h3 className="mt-2 font-display text-xl">{a.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-cream/70">{a.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={300}>
          <div className="mt-16 rounded-2xl border border-cream/10 bg-cream/5 p-8 backdrop-blur-sm">
            <Eyebrow tone="sage">By the numbers — facts, not promises</Eyebrow>
            <dl className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
              {FACTS.map((f, i) => (
                <Reveal key={f.label} delay={i * 60}>
                  <div>
                    <dt className="font-display text-2xl text-secondary md:text-3xl">{f.value}</dt>
                    <dd className="mt-1 text-xs leading-relaxed text-cream/70">{f.label}</dd>
                  </div>
                </Reveal>
              ))}
            </dl>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function ArtifactVisual({ kind }: { kind: "board" | "report" | "record" }) {
  if (kind === "board") {
    return (
      <div className="relative h-40 overflow-hidden rounded-md bg-cream p-3">
        <div className="grid h-full grid-cols-5 gap-1">
          {[
            { cat: "Situation", color: "oklch(0.65 0.04 152)" },
            { cat: "Thought", color: "oklch(0.7 0.04 0)" },
            { cat: "Emotion", color: "oklch(0.78 0.11 50)" },
            { cat: "Body", color: "oklch(0.65 0.04 152)" },
            { cat: "Behavior", color: "oklch(0.22 0.02 232)" },
          ].map((c, i) => (
            <div
              key={c.cat}
              className="flex flex-col gap-1 rounded-sm bg-[oklch(0.92_0.01_80)] p-1.5"
            >
              <span className="text-[0.55rem] font-bold uppercase tracking-wider text-charcoal">
                {c.cat.slice(0, 4)}
              </span>
              <div
                className="rounded-sm opacity-85"
                style={{ height: `${20 + i * 8}%`, background: c.color }}
              />
              <div
                className="rounded-sm opacity-50"
                style={{ height: "30%", background: c.color }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (kind === "report") {
    return (
      <div className="flex h-40 flex-col gap-2 rounded-md bg-cream p-3">
        <div className="flex items-center justify-between">
          <div className="h-2 w-16 rounded-sm bg-navy" />
          <div className="h-2 w-8 rounded-sm bg-secondary" />
        </div>
        <div className="rounded-sm bg-[oklch(0.92_0.01_80)] p-2">
          <div className="h-1.5 w-3/4 rounded-sm bg-navy/60" />
          <div className="mt-1 h-1.5 w-full rounded-sm bg-navy/30" />
          <div className="mt-1 h-1.5 w-5/6 rounded-sm bg-navy/30" />
        </div>
        <div className="grid flex-1 grid-cols-5 gap-0.5">
          {[
            "oklch(0.65 0.04 152)",
            "oklch(0.7 0.04 0)",
            "oklch(0.78 0.11 50)",
            "oklch(0.65 0.04 152)",
            "oklch(0.22 0.02 232)",
          ].map((c, i) => (
            <div key={i} className="rounded-sm opacity-60" style={{ background: c }} />
          ))}
        </div>
      </div>
    );
  }
  // record
  return (
    <div className="flex h-40 flex-col gap-1.5 rounded-md bg-cream p-3">
      {[
        { d: "Apr 22", t: "Session 04 · Anxiety Loop", c: "oklch(0.65 0.04 152)" },
        { d: "Apr 15", t: "Session 03 · Homework review", c: "oklch(0.78 0.11 50)" },
        { d: "Apr 08", t: "Session 02 · Anxiety Loop", c: "oklch(0.7 0.04 0)" },
        { d: "Apr 01", t: "Session 01 · Intake", c: "oklch(0.22 0.02 232)" },
      ].map((entry) => (
        <div
          key={entry.d}
          className="flex items-center gap-2 rounded-sm bg-[oklch(0.92_0.01_80)] px-2 py-1.5"
        >
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: entry.c }} />
          <span className="text-[0.6rem] font-bold text-navy">{entry.d}</span>
          <span className="truncate text-[0.6rem] text-charcoal/70">{entry.t}</span>
          <Lock className="ml-auto h-2.5 w-2.5 text-charcoal/50" />
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 08 · Features — fundo cream com cards coloridos                            */
/* -------------------------------------------------------------------------- */

const FEATURES = [
  {
    eyebrow: "Therapeutic boards",
    title: "Built around how CBT actually works.",
    body: "Anxiety Loop today. New boards added based on what your practice asks for — every one designed by a practicing CBT clinician, never by a generic content team.",
    Icon: Brain,
    accent: "oklch(0.65 0.04 152)",
    tint: "oklch(0.65 0.04 152 / 0.12)",
  },
  {
    eyebrow: "Clinical reports",
    title: "Defensible PDFs, in your voice.",
    body: "Pre-interpreted summary your supervisor reads in 30 seconds. Full board below for the chart. Branded with your practice. Attach to your EHR or share with families.",
    Icon: ScrollText,
    accent: "oklch(0.78 0.11 50)",
    tint: "oklch(0.78 0.11 50 / 0.14)",
  },
  {
    eyebrow: "Encrypted workspace",
    title: "Records you can actually defend.",
    body: "Every record encrypted at rest with AES-GCM-256. Per-workspace isolation enforced at the database. Full audit trail. Soft delete with 30-day recovery. BAA on Practice.",
    Icon: ShieldCheck,
    accent: "oklch(0.22 0.02 232)",
    tint: "oklch(0.22 0.02 232 / 0.1)",
  },
] as const;

function Features() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <Eyebrow>What&rsquo;s in the box</Eyebrow>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="mt-4 font-display text-4xl text-foreground md:text-5xl">
              Three things, <span className="italic">done deeply.</span>
            </h2>
          </Reveal>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {FEATURES.map((f, i) => {
            const { Icon } = f;
            return (
              <Reveal as="article" key={f.eyebrow} delay={i * 100}>
                <div
                  className="group relative h-full overflow-hidden rounded-2xl border border-border/40 bg-card p-8 transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-card-lift)]"
                >
                  {/* Top accent bar */}
                  <div
                    className="absolute inset-x-0 top-0 h-1"
                    style={{ background: f.accent }}
                  />
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{ background: f.tint }}
                  >
                    <Icon className="h-6 w-6" style={{ color: f.accent }} strokeWidth={2} />
                  </div>
                  <Eyebrow tone="sage" className="mt-6">
                    {f.eyebrow}
                  </Eyebrow>
                  <h3 className="mt-2 font-display text-2xl text-foreground">{f.title}</h3>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 09 · Pricing — fundo sage tint                                             */
/* -------------------------------------------------------------------------- */

const PRICING_FEATURES = [
  { label: "Active patients", basic: "Up to 15", practice: "Unlimited" },
  { label: "Clinical reports / month", basic: "50", practice: "Unlimited" },
  { label: "Therapeutic boards", basic: "Anxiety Loop", practice: "Full library + early access" },
  { label: "Magic-link patient homework", basic: false, practice: true },
  { label: "Encrypted workspace + audit log", basic: true, practice: true },
  { label: "Audit trail export", basic: false, practice: true },
  { label: "Custom branding on reports", basic: false, practice: true },
  { label: "BAA available", basic: false, practice: true },
  { label: "Priority support", basic: false, practice: true },
] as const;

function Pricing({ primaryCtaTo }: { primaryCtaTo: "/dashboard" | "/signup" }) {
  return (
    <section
      id="pricing"
      className="relative overflow-hidden border-y border-border/40"
      style={{ background: "var(--gradient-sage-soft)" }}
    >
      <div className="relative mx-auto max-w-5xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <Eyebrow tone="sage">Pricing</Eyebrow>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="mt-4 font-display text-4xl text-foreground md:text-5xl">
              One session pays for <span className="italic">the month.</span>
            </h2>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-6 text-base leading-relaxed text-muted-foreground">
              Both plans include the {TRIAL_DURATION_DAYS}-day free trial. No credit card. Cancel
              anytime.
            </p>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 md:items-stretch">
          {/* BASIC */}
          <Reveal>
            <article className="flex h-full flex-col rounded-2xl border border-border/40 bg-background p-8 shadow-[var(--shadow-card-soft)] transition-shadow hover:shadow-[var(--shadow-card-lift)]">
              <Eyebrow>Basic</Eyebrow>
              <p className="mt-4 font-display text-5xl text-foreground">
                $29
                <span className="text-base font-sans text-muted-foreground"> / month</span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                For clinicians building their first caseload.
              </p>

              <ul className="mt-8 flex-1 space-y-3 text-sm">
                {PRICING_FEATURES.map((f) => (
                  <PricingRow key={f.label} label={f.label} value={f.basic} />
                ))}
              </ul>

              <Link
                to={primaryCtaTo}
                className="mt-8 inline-flex items-center justify-center rounded-md border border-border bg-background px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Start with Basic
              </Link>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {TRIAL_DURATION_DAYS}-day free trial · No credit card
              </p>
            </article>
          </Reveal>

          {/* PRACTICE — destacado */}
          <Reveal delay={120}>
            <article className="relative flex h-full flex-col rounded-2xl border-2 border-secondary bg-background p-8 shadow-[var(--shadow-glow-sage)] md:scale-[1.02]">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-secondary px-4 py-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-secondary-foreground">
                Most popular · Best value
              </span>

              <Eyebrow tone="sage">Practice</Eyebrow>
              <p className="mt-4 font-display text-5xl text-foreground">
                $79
                <span className="text-base font-sans text-muted-foreground"> / month</span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Everything in Basic, plus the features full-time clinicians ask for first.
              </p>

              <ul className="mt-8 flex-1 space-y-3 text-sm">
                {PRICING_FEATURES.map((f) => {
                  const differs =
                    (f.basic as string | boolean) !== (f.practice as string | boolean);
                  return (
                    <PricingRow
                      key={f.label}
                      label={f.label}
                      value={f.practice}
                      highlight={differs}
                    />
                  );
                })}
              </ul>

              <Link
                to={primaryCtaTo}
                className="mt-8 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
              >
                Start Practice free for {TRIAL_DURATION_DAYS} days
                <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {TRIAL_DURATION_DAYS}-day free trial · No credit card
              </p>
            </article>
          </Reveal>
        </div>

        <Reveal delay={200}>
          <p className="mt-10 text-center text-xs text-muted-foreground">
            Group practice with multiple clinicians?{" "}
            <a
              href="mailto:hello@terapily.com?subject=Group%20practice%20inquiry"
              className="underline-offset-4 hover:underline"
            >
              Tell us about your clinic
            </a>{" "}
            — we&rsquo;re onboarding select group practices privately.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function PricingRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string | boolean;
  highlight?: boolean;
}) {
  const isBool = typeof value === "boolean";
  return (
    <li className="flex items-start justify-between gap-4 border-b border-border/40 pb-3 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          isBool
            ? value
              ? `inline-flex items-center font-medium ${highlight ? "text-secondary-foreground" : "text-foreground"}`
              : "inline-flex items-center text-muted-foreground/40"
            : `text-right font-medium ${highlight ? "text-foreground" : "text-foreground"}`
        }
      >
        {isBool ? (
          value ? (
            <Check className="h-4 w-4 text-secondary-foreground" />
          ) : (
            <Minus className="h-4 w-4" />
          )
        ) : (
          value
        )}
      </span>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* 10 · FAQ — fundo mauve tint                                                */
/* -------------------------------------------------------------------------- */

const FAQS = [
  {
    q: "Is my client data safe?",
    a: "Yes. Every patient record is encrypted at rest using AES-GCM-256. Each workspace is isolated at the database level — no clinician can ever see another's records. We log every access for your audit trail.",
    pillar: "Encrypted by design",
  },
  {
    q: "Are you HIPAA-compliant?",
    a: "Terapily is built to HIPAA's security requirements: encryption at rest, access controls, audit logging, and per-workspace isolation. We sign BAAs on the Practice plan on request.",
    pillar: "Audit-ready",
  },
  {
    q: "Will I need to migrate my existing notes?",
    a: "No. Terapily starts fresh with your next session. Your existing records stay where they are — in your EHR, in your filing cabinet, wherever. We're not asking you to move years of practice. We're asking you to try the next session differently.",
    pillar: "Yours to own",
  },
  {
    q: "Does this replace SimplePractice or TherapyNotes?",
    a: "No. Keep your EHR for billing, scheduling, and intake. Use Terapily for the clinical work itself — the session, the homework, the thread between visits. Export reports as PDFs and attach them to your existing chart.",
    pillar: "CBT, not generic forms",
  },
  {
    q: "What if my supervisor or board asks for my records?",
    a: "Export your full audit trail and patient archives anytime, in a format auditors recognize. Every access, every edit, every export is timestamped with the user who performed it. You're not depending on us to defend your practice — you have the evidence in your hands.",
    pillar: "Audit-ready",
  },
  {
    q: "Who built this?",
    a: "Terapily was built by a practicing CBT clinician for the workflow she couldn't find in existing software. Every design decision — the 5-component cognitive structure, the magic-link homework, the per-workspace encryption — comes from real clinical practice, not from a generic SaaS playbook.",
    pillar: "CBT, not generic forms",
  },
  {
    q: "What happens if Terapily goes down mid-session?",
    a: "Boards are drafted in your browser and synced to your encrypted workspace continuously. A connection blip doesn't lose your work — keep building, sync resumes when you're back online.",
    pillar: "Boring on purpose",
  },
  {
    q: "Will updates break my workflow?",
    a: "No. Terapily ships behind a stable interface. The drag-and-drop you learn in week one works the same in year three. We're boring on purpose.",
    pillar: "Boring on purpose",
  },
  {
    q: "Is the board really for adolescents and adults?",
    a: "Yes. The 5-component cognitive structure (situation → thought → emotion → body → behavior) is age-agnostic and rooted in standard CBT. We lead with adolescents because visual co-building has the strongest engagement evidence there, but the same boards work for adult anxiety, depression, and trauma-adjacent presentations.",
    pillar: "CBT, not generic forms",
  },
  {
    q: "What if I cancel?",
    a: `Cancel any time from your account. Export your patient records as encrypted archives. We delete your data within 30 days of cancellation, per HIPAA retention guidance.`,
    pillar: "Yours to own",
  },
] as const;

function Faq() {
  return (
    <section
      id="faq"
      className="border-y border-border/40"
      style={{ background: "var(--gradient-mauve-soft)" }}
    >
      <div className="mx-auto max-w-3xl px-6 py-24">
        <div className="text-center">
          <Reveal>
            <Eyebrow>Questions you&rsquo;re probably asking</Eyebrow>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="mt-4 font-display text-4xl text-foreground md:text-5xl">
              Objection handling, <span className="italic">on the record.</span>
            </h2>
          </Reveal>
        </div>

        <dl className="mt-14 space-y-3">
          {FAQS.map((item, i) => (
            <Reveal key={item.q} delay={Math.min(i * 40, 320)}>
              <details className="group rounded-xl border border-border/40 bg-background/85 p-6 shadow-sm backdrop-blur-sm transition-shadow open:shadow-[var(--shadow-card-soft)] [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer items-start justify-between gap-4">
                  <dt className="font-display text-lg text-foreground">{item.q}</dt>
                  <span
                    className="mt-1 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-secondary/15 text-secondary-foreground transition-transform group-open:rotate-45"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <dd className="mt-4 text-sm leading-relaxed text-muted-foreground">{item.a}</dd>
                <p className="mt-3 inline-flex items-center gap-1.5 text-[0.65rem] uppercase tracking-[0.12em] text-secondary-foreground">
                  <Activity className="h-3 w-3" />
                  Pillar · {item.pillar}
                </p>
              </details>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 11 · Closing CTA — fundo navy com glow                                     */
/* -------------------------------------------------------------------------- */

function ClosingCta({
  primaryCtaTo,
  primaryCtaLabel,
}: {
  primaryCtaTo: "/dashboard" | "/signup";
  primaryCtaLabel: string;
}) {
  return (
    <section
      className="relative overflow-hidden text-cream"
      style={{ background: "var(--gradient-navy-glow)" }}
    >
      <div
        aria-hidden
        className="blob-drift pointer-events-none absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-3xl"
        style={{ background: "oklch(0.65 0.04 152 / 0.5)" }}
      />

      <div className="relative mx-auto max-w-3xl px-6 py-32 text-center">
        <Reveal>
          <Eyebrow tone="sage">End of the page, start of the work</Eyebrow>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="mt-6 font-display text-5xl md:text-6xl">
            Try Terapily with your <br className="hidden md:block" />
            <span className="italic text-[oklch(0.85_0.05_152)]">next session.</span>
          </h2>
        </Reveal>
        <Reveal delay={160}>
          <p className="mx-auto mt-8 max-w-xl text-base leading-relaxed text-cream/75 md:text-lg">
            {TRIAL_DURATION_DAYS}-day free trial. No credit card. Cancel anytime. If Terapily
            doesn&rsquo;t earn its place in your practice, you walk away with your data and we
            delete ours.
          </p>
        </Reveal>
        <Reveal delay={240}>
          <div className="mt-10">
            <Link
              to={primaryCtaTo}
              className="group inline-flex items-center justify-center gap-2 rounded-md bg-cream px-8 py-4 text-base font-medium text-navy shadow-[var(--shadow-glow-sage)] transition-all hover:scale-[1.02] hover:bg-cream/95"
            >
              {primaryCtaLabel}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </Reveal>
        <Reveal delay={320}>
          <p className="mt-6 text-xs text-cream/60">
            Still have questions?{" "}
            <a
              href="mailto:hello@terapily.com"
              className="underline-offset-4 hover:underline"
            >
              hello@terapily.com
            </a>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
