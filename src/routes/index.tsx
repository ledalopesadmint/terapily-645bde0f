import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { BRAND, TRIAL_DURATION_DAYS } from "@/lib/constants";
import { useAuth } from "@/features/auth/AuthProvider";

/**
 * Landing pública (sales page) — EN-US.
 * Posicionamento: stateful clinical platform com PHI encryption + audit.
 * Público: CBT clinicians treating adolescents and adults (adolescente lidera).
 * Pricing MVP: apenas Basic + Practice (Clinic vem pós-launch).
 * Sem depoimentos (ver mem://features/mvp-pricing-two-plans).
 * Argumento dominante: defensabilidade clínica + continuidade terapêutica.
 * App interno permanece em PT-BR até a S5 (ver mem://preferences/language-strategy).
 */

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title:
          "Terapily · Therapy your client helps build. The audit trail you need.",
      },
      {
        name: "description",
        content:
          "Terapily turns each CBT session into a visual board you co-build with your client, then auto-generates a clinical report ready for the chart. TLS 1.3 in transit. AES-GCM-256 at rest. Built to support HIPAA. BAA signed with every Practice account.",
      },
      {
        property: "og:title",
        content:
          "Terapily · Therapy your client helps build. The audit trail you need.",
      },
      {
        property: "og:description",
        content:
          "Visual CBT boards your client co-builds in session. Auto-generated clinical reports. TLS 1.3 in transit, AES-GCM-256 at rest, BAA signed at signup. Built for CBT clinicians treating adolescents and adults.",
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
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Logo size="sm" />
        <nav className="flex items-center gap-6 text-sm">
          <a
            href="#pricing"
            className="hidden text-muted-foreground transition-colors hover:text-foreground sm:inline"
          >
            Pricing
          </a>
          <a
            href="#faq"
            className="hidden text-muted-foreground transition-colors hover:text-foreground sm:inline"
          >
            FAQ
          </a>
          {!isLoading && !isAuthenticated && (
            <Link
              to="/login"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Log in
            </Link>
          )}
          <Link
            to={primaryCtaTo}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
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
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 text-xs text-muted-foreground sm:flex-row">
        <p>
          © {new Date().getFullYear()} {BRAND.name}, Inc. TLS 1.3 in transit · AES-GCM-256 at rest · BAA signed with every Practice account.
        </p>
        <p className="font-display italic">Where better therapy begins.</p>
      </div>
    </footer>
  );
}

/* -------------------------------------------------------------------------- */
/* 01 · Hero                                                                  */
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
    <section className="mx-auto max-w-5xl px-6 py-24 text-center md:py-32">
      <Eyebrow tone="mauve">
        Built for CBT clinicians treating adolescents &amp; adults
      </Eyebrow>

      <h1 className="mt-6 font-display text-5xl text-foreground md:text-7xl">
        Therapy your client <br className="hidden md:block" />
        helps build. The audit <br className="hidden md:block" />
        trail you need.
      </h1>

      <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
        <em className="font-display not-italic">Terapily</em> turns each CBT session into a visual
        board you co-build with your client, then auto-generates a clean clinical report ready for
        the chart, the family, or your supervisor. TLS 1.3 in transit. AES-GCM-256 at rest. BAA
        signed at signup.
      </p>

      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          to={primaryCtaTo}
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {primaryCtaLabel}
        </Link>
        {!isAuthenticated && (
          <a
            href="#see-it-work"
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            See how it works
          </a>
        )}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        No credit card · Cancel anytime · BAA signed before your first patient
      </p>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 02 · Trust strip — 5 pillars                                               */
/* -------------------------------------------------------------------------- */

const PILLARS = [
  {
    n: "01",
    title: "Encrypted end-to-server",
    body: "TLS 1.3 in transit. AES-GCM-256 at rest. Per-workspace isolation enforced at the database. Signed BAA covers every PHI subprocessor.",
  },
  {
    n: "02",
    title: "CBT, not generic forms",
    body: "Built around Beck's cognitive model and the 5-component structure clinicians actually use in session.",
  },
  {
    n: "03",
    title: "Audit-ready",
    body: "Every read, every edit, every export — logged with timestamp and user. Export the trail anytime.",
  },
  {
    n: "04",
    title: "Boring on purpose",
    body: "Stable interface. Predictable updates. The workflow you learn this week works the same in year three.",
  },
  {
    n: "05",
    title: "Yours to own",
    body: "Export your full patient archive anytime. No lock-in. Your data leaves with you.",
  },
] as const;

function TrustStrip() {
  return (
    <section className="border-y border-border/60 bg-card/40">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {PILLARS.map((p) => (
            <div key={p.n}>
              <Eyebrow tone="sage">
                {p.n} · {p.title}
              </Eyebrow>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 03 · Problem                                                               */
/* -------------------------------------------------------------------------- */

function Problem() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24 text-center">
      <Eyebrow>The quiet problem</Eyebrow>
      <h2 className="mt-4 font-display text-4xl text-foreground md:text-5xl">
        Between sessions, the work disappears.
      </h2>
      <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
        You finish a 50-minute session. Your client leaves with a worksheet, a homework idea, and
        the best of intentions. Two weeks later they&rsquo;re back — and you spend the first 15
        minutes reconstructing what should have happened in between.
      </p>
      <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
        Meanwhile, your notes live in three places. The session board lives on a whiteboard you
        photographed. The homework lives in a worksheet you may never see again. And if anyone — a
        supervisor, an auditor, a board — ever asks for the thread, you have to assemble it from
        memory.
      </p>
      <p className="mx-auto mt-8 max-w-xl font-display text-2xl italic text-foreground">
        That&rsquo;s not a documentation problem. That&rsquo;s a clinical continuity problem.
      </p>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 04 · Solution — 4 phases                                                   */
/* -------------------------------------------------------------------------- */

const SOLUTION_PHASES = [
  {
    n: "In session",
    title: "Co-build the board, live.",
    body: "Drag situation → thought → emotion → body → behavior cards onto a shared canvas. Pull from a clinically authored CBT vocabulary deck. Your client watches their own pattern emerge — and leaves the session with something they helped build.",
  },
  {
    n: "End of session",
    title: "One click. One report.",
    body: "A clean clinical report — pre-interpreted summary on top, full board below. Export as branded PDF or save to the patient's encrypted record. Ready before your client closes the door.",
  },
  {
    n: "Between sessions",
    title: "Continue the work, securely.",
    body: "Send a magic link your client opens on any device. They continue the homework. You see their progress before the next session. No app install. No password reset emails at 11pm.",
  },
  {
    n: "Next session",
    title: "Open at the line where you left off.",
    body: "The patient record opens with the full thread already there. Last board, last notes, last homework status. No reconstruction. No 'remind me where we were.'",
  },
] as const;

function Solution() {
  return (
    <section
      id="solution"
      className="border-y border-border/60 bg-card/40"
    >
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow tone="sage">The Terapily flow</Eyebrow>
          <h2 className="mt-4 font-display text-4xl text-foreground md:text-5xl">
            One board. One report. One encrypted thread.
          </h2>
        </div>

        <ol className="mt-16 grid gap-10 md:grid-cols-2 md:gap-12">
          {SOLUTION_PHASES.map((phase, i) => (
            <li
              key={phase.n}
              className="relative rounded-lg border border-border/60 bg-background p-8"
            >
              <span className="absolute -top-3 left-8 rounded-full bg-secondary px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-secondary-foreground">
                {String(i + 1).padStart(2, "0")} · {phase.n}
              </span>
              <h3 className="mt-3 font-display text-2xl text-foreground">{phase.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{phase.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 05 · Where it fits — não compete com EHR                                   */
/* -------------------------------------------------------------------------- */

function WhereItFits() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-24 text-center">
      <Eyebrow>Where it fits</Eyebrow>
      <h2 className="mt-4 font-display text-4xl text-foreground md:text-5xl">
        Terapily doesn&rsquo;t replace your EHR. <br className="hidden md:block" />
        It does what your EHR can&rsquo;t.
      </h2>
      <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
        Keep SimplePractice, TherapyNotes, or whatever you use for billing and scheduling. Use
        Terapily for the clinical work itself — the session, the homework, the thread between
        visits. Export reports as branded PDFs and attach them to your existing chart in seconds.
      </p>
      <p className="mx-auto mt-6 max-w-xl text-sm text-muted-foreground">
        No data migration. No second login for your front desk. No replacing the systems your
        practice already runs on.
      </p>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 06 · Comparison                                                            */
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
  [
    "Between-session work",
    "None",
    "None",
    "Secure magic-link homework",
  ],
  [
    "PHI security model",
    "Stored, varies by vendor",
    "Audio + transcript stored",
    "Per-workspace, encrypted at rest, audit-logged",
  ],
  ["Setup time", "2–6 hours", "30 minutes", "Under 90 seconds"],
  [
    "Origin",
    "Generalist software",
    "AI-first, clinical-second",
    "Clinical-first, by design",
  ],
] as const;

function Comparison() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <Eyebrow>Why Terapily</Eyebrow>
        <h2 className="mt-4 font-display text-4xl text-foreground md:text-5xl">
          Not the tools you&rsquo;ve already tried.
        </h2>
        <p className="mt-6 text-base leading-relaxed text-muted-foreground">
          A direct comparison with the three categories most CBT clinicians are choosing between
          today.
        </p>
      </div>

      <div className="mt-12 overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="bg-card/60">
              <th className="p-4 text-left font-medium text-muted-foreground"></th>
              <th className="p-4 text-left font-medium text-muted-foreground">
                Generic EHRs
              </th>
              <th className="p-4 text-left font-medium text-muted-foreground">
                AI transcription
              </th>
              <th className="border-l-4 border-secondary p-4 text-left font-display text-base text-foreground">
                Terapily
              </th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON_ROWS.map((row, i) => (
              <tr
                key={row[0]}
                className={i % 2 === 0 ? "bg-background" : "bg-card/30"}
              >
                <td className="p-4 font-medium text-foreground">{row[0]}</td>
                <td className="p-4 text-muted-foreground">{row[1]}</td>
                <td className="p-4 text-muted-foreground">{row[2]}</td>
                <td className="border-l-4 border-secondary p-4 text-foreground">{row[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted-foreground">
        AI transcription tools listen to your session. Terapily builds a clinical artifact{" "}
        <em className="font-display not-italic text-foreground">with</em> your client — and the
        report is a byproduct of the work, not the product itself.
      </p>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 07 · See it work — substitui ROI calculator                                */
/* -------------------------------------------------------------------------- */

const ARTIFACTS = [
  {
    label: "01 · The session board",
    title: "Drag-and-drop canvas",
    body: "5 categories, vocabulary deck, free-text. Built in session, with the client.",
    visual: "board",
  },
  {
    label: "02 · The clinical report",
    title: "Branded PDF, in seconds",
    body: "Pre-interpreted summary on top. Full board below. Branded with your practice.",
    visual: "report",
  },
  {
    label: "03 · The encrypted record",
    title: "One thread per patient",
    body: "Every board, every report, every homework — encrypted at rest, audit-logged.",
    visual: "record",
  },
] as const;

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
      className="border-y border-border/60 bg-[oklch(0.22_0.02_232)] text-[oklch(0.95_0.01_80)]"
    >
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow tone="sage">What it actually looks like</Eyebrow>
          <h2 className="mt-4 font-display text-4xl md:text-5xl">
            A board, a report, a record. <br className="hidden md:block" />
            That&rsquo;s the product.
          </h2>
          <p className="mt-6 text-base leading-relaxed text-[oklch(0.78_0.01_80)]">
            No demo call required. Three artifacts every session produces.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {ARTIFACTS.map((a) => (
            <article
              key={a.label}
              className="rounded-lg border border-white/10 bg-white/5 p-6"
            >
              <ArtifactVisual kind={a.visual} />
              <p className="mt-5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-secondary">
                {a.label}
              </p>
              <h3 className="mt-2 font-display text-xl">{a.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[oklch(0.78_0.01_80)]">{a.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-16 rounded-lg border border-white/10 bg-white/5 p-8">
          <Eyebrow tone="sage">By the numbers — facts, not promises</Eyebrow>
          <dl className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {FACTS.map((f) => (
              <div key={f.label}>
                <dt className="font-display text-2xl text-secondary md:text-3xl">{f.value}</dt>
                <dd className="mt-1 text-xs leading-relaxed text-[oklch(0.78_0.01_80)]">
                  {f.label}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

function ArtifactVisual({ kind }: { kind: string }) {
  if (kind === "board") {
    return (
      <div className="relative h-40 overflow-hidden rounded-md bg-[oklch(0.95_0.01_80)] p-3">
        <div className="grid h-full grid-cols-5 gap-1">
          {["Situation", "Thought", "Emotion", "Body", "Behavior"].map((cat, i) => (
            <div
              key={cat}
              className="flex flex-col gap-1 rounded-sm bg-[oklch(0.92_0.01_80)] p-1.5"
            >
              <span className="text-[0.55rem] font-bold uppercase tracking-wider text-[oklch(0.4_0.04_232)]">
                {cat.slice(0, 4)}
              </span>
              <div
                className="rounded-sm bg-[oklch(0.65_0.04_152)] opacity-80"
                style={{ height: `${20 + i * 8}%` }}
              />
              <div className="rounded-sm bg-[oklch(0.7_0.05_30)] opacity-60" style={{ height: "30%" }} />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (kind === "report") {
    return (
      <div className="flex h-40 flex-col gap-2 rounded-md bg-[oklch(0.95_0.01_80)] p-3">
        <div className="flex items-center justify-between">
          <div className="h-2 w-16 rounded-sm bg-[oklch(0.4_0.04_232)]" />
          <div className="h-2 w-8 rounded-sm bg-[oklch(0.65_0.04_152)]" />
        </div>
        <div className="rounded-sm bg-[oklch(0.92_0.01_80)] p-2">
          <div className="h-1.5 w-3/4 rounded-sm bg-[oklch(0.55_0.03_232)]" />
          <div className="mt-1 h-1.5 w-full rounded-sm bg-[oklch(0.7_0.02_232)]" />
          <div className="mt-1 h-1.5 w-5/6 rounded-sm bg-[oklch(0.7_0.02_232)]" />
        </div>
        <div className="flex-1 grid grid-cols-5 gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-sm bg-[oklch(0.85_0.02_80)]" />
          ))}
        </div>
      </div>
    );
  }
  // record
  return (
    <div className="flex h-40 flex-col gap-1.5 rounded-md bg-[oklch(0.95_0.01_80)] p-3">
      {[
        { d: "Apr 22", t: "Session 04 · Anxiety Loop" },
        { d: "Apr 15", t: "Session 03 · Homework review" },
        { d: "Apr 08", t: "Session 02 · Anxiety Loop" },
        { d: "Apr 01", t: "Session 01 · Intake" },
      ].map((entry) => (
        <div
          key={entry.d}
          className="flex items-center gap-2 rounded-sm bg-[oklch(0.92_0.01_80)] px-2 py-1.5"
        >
          <div className="h-1.5 w-1.5 rounded-full bg-[oklch(0.65_0.04_152)]" />
          <span className="text-[0.6rem] font-bold text-[oklch(0.4_0.04_232)]">{entry.d}</span>
          <span className="truncate text-[0.6rem] text-[oklch(0.5_0.02_232)]">{entry.t}</span>
          <span className="ml-auto text-[0.5rem] text-[oklch(0.6_0.02_232)]">🔒</span>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 08 · Features                                                              */
/* -------------------------------------------------------------------------- */

const FEATURES = [
  {
    eyebrow: "Therapeutic boards",
    title: "Built around how CBT actually works.",
    body: "Anxiety Loop today. New boards added based on what your practice asks for — every one designed by a practicing CBT clinician, never by a generic content team.",
  },
  {
    eyebrow: "Clinical reports",
    title: "Documentation built for the chart.",
    body: "Pre-interpreted summary your supervisor reads in 30 seconds. Full board below for the chart. Branded with your practice. Attach to your EHR or share with families.",
  },
  {
    eyebrow: "Encrypted workspace",
    title: "Records with the audit trail you need.",
    body: "TLS 1.3 in transit. AES-GCM-256 at rest. Per-workspace isolation at the database. Full audit trail you can export. Soft delete with 30-day recovery. BAA signed at signup on Practice.",
  },
] as const;

function Features() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <Eyebrow>What&rsquo;s in the box</Eyebrow>
        <h2 className="mt-4 font-display text-4xl text-foreground md:text-5xl">
          Three things, done deeply.
        </h2>
      </div>

      <div className="mt-16 grid gap-10 md:grid-cols-3">
        {FEATURES.map((f) => (
          <article key={f.eyebrow} className="rounded-lg border border-border/60 bg-card/40 p-8">
            <Eyebrow tone="sage">{f.eyebrow}</Eyebrow>
            <h3 className="mt-3 font-display text-2xl text-foreground">{f.title}</h3>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 09 · Pricing — Basic + Practice (Clinic hidden until post-launch)          */
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
    <section id="pricing" className="border-y border-border/60 bg-card/40">
      <div className="mx-auto max-w-5xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow tone="sage">Pricing</Eyebrow>
          <h2 className="mt-4 font-display text-4xl text-foreground md:text-5xl">
            One session pays for the month.
          </h2>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground">
            Both plans include the {TRIAL_DURATION_DAYS}-day free trial. No credit card. Cancel
            anytime.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 md:items-stretch">
          {/* BASIC */}
          <article className="flex flex-col rounded-lg border border-border/60 bg-background p-8">
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

          {/* PRACTICE — destacado */}
          <article className="relative flex flex-col rounded-lg border-2 border-secondary bg-background p-8 shadow-[0_8px_30px_-12px_oklch(0.65_0.04_152_/_0.4)] md:scale-[1.02]">
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
              className="mt-8 inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Start Practice free for {TRIAL_DURATION_DAYS} days
            </Link>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {TRIAL_DURATION_DAYS}-day free trial · No credit card
            </p>
          </article>
        </div>

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
              ? `font-medium ${highlight ? "text-secondary" : "text-foreground"}`
              : "text-muted-foreground/50"
            : `text-right font-medium ${highlight ? "text-foreground" : "text-foreground"}`
        }
      >
        {isBool ? (value ? "✓" : "—") : value}
      </span>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* 10 · FAQ                                                                   */
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
    <section id="faq" className="border-y border-border/60 bg-card/40">
      <div className="mx-auto max-w-3xl px-6 py-24">
        <div className="text-center">
          <Eyebrow>Questions you&rsquo;re probably asking</Eyebrow>
          <h2 className="mt-4 font-display text-4xl text-foreground md:text-5xl">
            Objection handling, on the record.
          </h2>
        </div>

        <dl className="mt-14 space-y-4">
          {FAQS.map((item) => (
            <details
              key={item.q}
              className="group rounded-lg border border-border/60 bg-background p-6 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer items-start justify-between gap-4">
                <dt className="font-display text-lg text-foreground">{item.q}</dt>
                <span
                  className="mt-1 text-secondary transition-transform group-open:rotate-45"
                  aria-hidden="true"
                >
                  +
                </span>
              </summary>
              <dd className="mt-4 text-sm leading-relaxed text-muted-foreground">{item.a}</dd>
              <p className="mt-3 text-[0.65rem] uppercase tracking-[0.12em] text-secondary">
                Pillar · {item.pillar}
              </p>
            </details>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 11 · Closing CTA                                                           */
/* -------------------------------------------------------------------------- */

function ClosingCta({
  primaryCtaTo,
  primaryCtaLabel,
}: {
  primaryCtaTo: "/dashboard" | "/signup";
  primaryCtaLabel: string;
}) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-32 text-center">
      <Eyebrow tone="sage">End of the page, start of the work</Eyebrow>
      <h2 className="mt-6 font-display text-5xl text-foreground md:text-6xl">
        Try Terapily with your <br className="hidden md:block" />
        next session.
      </h2>
      <p className="mx-auto mt-8 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
        {TRIAL_DURATION_DAYS}-day free trial. No credit card. Cancel anytime. If Terapily
        doesn&rsquo;t earn its place in your practice, you walk away with your data and we delete
        ours.
      </p>
      <div className="mt-10">
        <Link
          to={primaryCtaTo}
          className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-4 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {primaryCtaLabel} →
        </Link>
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        Still have questions?{" "}
        <a
          href="mailto:hello@terapily.com"
          className="underline-offset-4 hover:underline"
        >
          hello@terapily.com
        </a>
      </p>
    </section>
  );
}
