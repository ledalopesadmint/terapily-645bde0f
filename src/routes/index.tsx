import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { BRAND, TRIAL_DURATION_DAYS } from "@/lib/constants";
import { useAuth } from "@/features/auth/AuthProvider";

/**
 * Landing pública (sales page) — EN-US.
 * Posicionamento: stateful clinical platform com PHI encryption + audit.
 * Pricing MVP: apenas Basic + Practice (Clinic vem pós-launch).
 * App interno permanece em PT-BR até a S5 (ver mem://preferences/language-strategy).
 */

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "Terapily · CBT homework that kids actually finish — and the report that writes itself",
      },
      {
        name: "description",
        content:
          "Terapily turns every CBT session into a visual board your young clients build with you, then auto-generates a clean clinical report. PHI encrypted at rest. BAA available. 14-day free trial.",
      },
      {
        property: "og:title",
        content:
          "Terapily · CBT homework that kids actually finish — and the report that writes itself",
      },
      {
        property: "og:description",
        content:
          "Visual CBT boards your clients co-build in session. Auto-generated clinical reports. Encrypted patient workspace. Built for therapists working with kids and teens.",
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
        <Comparison />
        <RoiCalculator primaryCtaTo={primaryCtaTo} />
        <Features />
        <Pricing primaryCtaTo={primaryCtaTo} />
        <SocialProof />
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
          © {new Date().getFullYear()} {BRAND.name}, Inc. PHI encrypted at rest. BAA available.
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
      <Eyebrow tone="mauve">Built for CBT therapists working with kids &amp; teens</Eyebrow>

      <h1 className="mt-6 font-display text-5xl text-foreground md:text-7xl">
        The homework your clients <br className="hidden md:block" />
        actually do — and the report <br className="hidden md:block" />
        that writes itself.
      </h1>

      <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
        <em className="font-display not-italic">Terapily</em> turns every session into a visual
        board your clients build <em className="font-display">with you</em>, then auto-generates a
        clean clinical report you can export, share, or keep in your encrypted workspace. Less
        paperwork. More presence.
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
            href="#solution"
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            See a sample report
          </a>
        )}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        No credit card · Cancel anytime · BAA available on Practice
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
    title: "Encrypted by design",
    body: "PHI encrypted at rest with AES-GCM-256. Per-workspace isolation.",
  },
  {
    n: "02",
    title: "Built for clinical use",
    body: "Made by and for CBT clinicians. Not retrofitted billing software.",
  },
  {
    n: "03",
    title: "Audit-ready",
    body: "Every access, every change, logged. Export your audit trail anytime.",
  },
  {
    n: "04",
    title: "Always evolving",
    body: "Weekly updates that never break your workflow.",
  },
  {
    n: "05",
    title: "Professional-grade",
    body: "Production-ready from day one. Not a side project.",
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
      <Eyebrow>The hidden cost</Eyebrow>
      <h2 className="mt-4 font-display text-4xl text-foreground md:text-5xl">
        Unstructured CBT homework is quietly burning your hour.
      </h2>
      <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
        You finish a 50-minute session, hand your client a worksheet, and hope. Two weeks later,
        the worksheet shows up half-filled — or not at all. You spend the first 15 minutes of next
        session reconstructing what should have happened between visits.
      </p>
      <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
        That&rsquo;s <span className="text-foreground">$50 to $120 of your clinical hour</span>{" "}
        burned on paperwork archaeology.
      </p>
      <p className="mx-auto mt-6 max-w-xl font-display text-2xl italic text-foreground">
        Multiply by 18 sessions a week. The math is uncomfortable.
      </p>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 04 · Solution                                                              */
/* -------------------------------------------------------------------------- */

const SOLUTION_PHASES = [
  {
    n: "In session",
    title: "Co-build the board, live.",
    body: "Drag situation → thought → emotion → body → behavior cards onto a shared canvas. Pull from a 200-card CBT vocabulary deck. Your client watches their own pattern emerge.",
  },
  {
    n: "End of session",
    title: "One click. One report.",
    body: "A clean, branded clinical report — pre-interpreted summary on top, full board below. Export as PDF or save to the patient's encrypted record.",
  },
  {
    n: "Between sessions",
    title: "Send a secure magic link.",
    body: "Your client continues the homework at home. You see their progress before the next session. No app install. No password fatigue.",
  },
  {
    n: "Next session",
    title: "Start at minute zero.",
    body: "Open their encrypted record. The thread is already there. No reconstruction. No 'remind me where we left off.'",
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
            One board. One report. One encrypted workspace.
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
/* 05 · Comparison                                                            */
/* -------------------------------------------------------------------------- */

const COMPARISON_ROWS = [
  ["Built for", "Billing & admin", "Note generation", "Live clinical work"],
  ["CBT-native", "No — generic forms", "No — passive listener", "Yes — purpose-built"],
  [
    "Client engagement",
    "PDF emailed, often ignored",
    "Client never sees it",
    "Client co-builds in session",
  ],
  ["Between-session work", "None", "None", "Secure magic-link homework"],
  [
    "PHI security",
    "Stored, varies by vendor",
    "Stores transcripts",
    "Encrypted at rest + audit log",
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
          Not the EHRs you&rsquo;ve already tried.
        </h2>
        <p className="mt-6 text-base leading-relaxed text-muted-foreground">
          A direct comparison with the two categories most CBT therapists are choosing between
          today.
        </p>
      </div>

      <div className="mt-12 overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="bg-card/60">
              <th className="p-4 text-left font-medium text-muted-foreground"></th>
              <th className="p-4 text-left font-medium text-muted-foreground">
                Generic EHRs
              </th>
              <th className="p-4 text-left font-medium text-muted-foreground">
                Transcription tools
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
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 06 · ROI Calculator                                                        */
/* -------------------------------------------------------------------------- */

function RoiCalculator({ primaryCtaTo }: { primaryCtaTo: "/dashboard" | "/signup" }) {
  const [sessions, setSessions] = useState(18);
  const [rate, setRate] = useState(150);
  const [minutes, setMinutes] = useState(12);

  const { weekly, monthly, yearly, roi } = useMemo(() => {
    const weeklyVal = (sessions * minutes * rate) / 60;
    const monthlyVal = weeklyVal * 4;
    const yearlyVal = weeklyVal * 52;
    const practicePrice = 79;
    const roiVal = monthlyVal / practicePrice;
    return {
      weekly: weeklyVal,
      monthly: monthlyVal,
      yearly: yearlyVal,
      roi: roiVal,
    };
  }, [sessions, rate, minutes]);

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return (
    <section className="border-y border-border/60 bg-[oklch(0.22_0.02_232)] text-[oklch(0.95_0.01_80)]">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow tone="sage">Run the numbers</Eyebrow>
          <h2 className="mt-4 font-display text-4xl md:text-5xl">
            See the money before the price.
          </h2>
          <p className="mt-6 text-base leading-relaxed text-[oklch(0.78_0.01_80)]">
            Your inputs. Your hourly rate. Your weekly volume. Conservative defaults from solo
            practice benchmarks.
          </p>
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-2">
          {/* Inputs */}
          <div className="space-y-8 rounded-lg border border-white/10 bg-white/5 p-8">
            <RoiInput
              label="Sessions per week"
              hint="Average for solo practice"
              value={sessions}
              min={5}
              max={40}
              onChange={setSessions}
              format={(v) => `${v}`}
            />
            <RoiInput
              label="Your hourly rate (USD)"
              hint="What you bill, not what you net"
              value={rate}
              min={80}
              max={400}
              step={5}
              onChange={setRate}
              format={(v) => `$${v}`}
            />
            <RoiInput
              label="Minutes saved per session"
              hint="Conservative: skip the worksheet recap"
              value={minutes}
              min={5}
              max={25}
              onChange={setMinutes}
              format={(v) => `${v} min`}
            />
          </div>

          {/* Output */}
          <div className="flex flex-col justify-between rounded-lg border border-secondary/40 bg-secondary/10 p-8">
            <div>
              <Eyebrow tone="sage">Your numbers</Eyebrow>
              <p className="mt-4 font-display text-6xl leading-none text-[oklch(0.95_0.01_80)] md:text-7xl">
                {fmt(weekly)}
              </p>
              <p className="mt-3 text-sm text-[oklch(0.78_0.01_80)]">recovered every week</p>

              <div className="mt-8 grid grid-cols-2 gap-6 border-t border-white/10 pt-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-[oklch(0.78_0.01_80)]">
                    Per month
                  </p>
                  <p className="mt-1 font-display text-2xl">{fmt(monthly)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-[oklch(0.78_0.01_80)]">
                    Per year
                  </p>
                  <p className="mt-1 font-display text-2xl">{fmt(yearly)}</p>
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-md bg-secondary/20 p-5">
              <p className="text-xs uppercase tracking-[0.12em] text-secondary">
                Practice plan · $79 / month
              </p>
              <p className="mt-2 font-display text-xl text-[oklch(0.95_0.01_80)]">
                ROI: {roi.toFixed(1)}× in month one
              </p>
            </div>

            <Link
              to={primaryCtaTo}
              className="mt-6 inline-flex items-center justify-center rounded-md bg-secondary px-6 py-3 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/90"
            >
              Recover this much next month →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function RoiInput({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="text-sm font-medium text-[oklch(0.95_0.01_80)]">{label}</label>
        <span className="font-display text-2xl text-secondary">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 w-full accent-[oklch(0.65_0.04_152)]"
      />
      <p className="mt-2 text-xs text-[oklch(0.78_0.01_80)]">{hint}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 07 · Features                                                              */
/* -------------------------------------------------------------------------- */

const FEATURES = [
  {
    eyebrow: "Therapeutic boards",
    title: "Built around how CBT actually works.",
    body: "Anxiety Loop today. Cognitive Distortion sorter, Behavior Activation tracker, and Emotion Wheel rolling out through Q3. Every board co-designed with practicing clinicians — never with a generic content team.",
  },
  {
    eyebrow: "Clinical reports",
    title: "Branded PDFs in under three seconds.",
    body: "Pre-interpreted summary on top so your supervisor reads it in 30 seconds. Full board below for the chart. Attach to your EHR or share with families. Your branding, your voice.",
  },
  {
    eyebrow: "Encrypted workspace",
    title: "Patient records you can actually defend.",
    body: "Every record encrypted at rest with AES-GCM-256. Per-workspace isolation enforced at the database. Full audit trail of every access. Soft delete with 30-day recovery. BAA on Practice.",
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
/* 08 · Pricing — Basic + Practice (Clinic hidden until post-launch)          */
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
            Pays for itself in week one.
          </h2>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground">
            Both plans include the {TRIAL_DURATION_DAYS}-day free trial. No credit card. Cancel
            anytime.
          </p>
        </div>

        {/* Founding 100 banner */}
        <div className="mx-auto mt-10 max-w-2xl rounded-lg border border-secondary/40 bg-secondary/10 px-6 py-4 text-center">
          <p className="text-sm text-foreground">
            <span className="font-display text-base">Founding 100 offer</span> — first 100 Practice
            subscribers lock in <span className="font-medium">$49/month for life</span>.{" "}
            <span className="font-medium text-secondary">23 spots left.</span>
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
              For therapists building their first caseload.
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
            <div className="mt-4 flex items-baseline gap-3">
              <p className="font-display text-5xl text-foreground">
                $79
                <span className="text-base font-sans text-muted-foreground"> / month</span>
              </p>
              <span className="rounded-full bg-mauve/20 px-2 py-1 text-[0.65rem] font-medium uppercase tracking-[0.08em] text-[oklch(0.4_0.04_0)]">
                or $49/mo · founding 100
              </span>
            </div>
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
              No credit card · Lock in $49/mo if you&rsquo;re in the first 100
            </p>
          </article>
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Group practice with multiple therapists?{" "}
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
/* 09 · Social Proof                                                          */
/* -------------------------------------------------------------------------- */

const QUOTES = [
  {
    quote:
      "My teen clients actually engage with the board. Seeing the report makes them feel ownership of their own thinking.",
    name: "L. M., LCSW",
    state: "California",
  },
  {
    quote:
      "I save about 12 minutes per session on documentation. That's a full extra client per week.",
    name: "R. K., LMFT",
    state: "Texas",
  },
  {
    quote:
      "The encryption and audit log gave my supervisor everything she needed in one conversation. We were live in a week.",
    name: "J. P., PsyD",
    state: "New York",
  },
] as const;

const STATES = ["CA", "NY", "TX", "FL", "IL", "MA", "CO", "WA"] as const;

function SocialProof() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <Eyebrow>From practicing clinicians</Eyebrow>
        <h2 className="mt-4 font-display text-4xl text-foreground md:text-5xl">
          Trusted in private practices across the U.S.
        </h2>
      </div>

      <div className="mt-14 grid gap-8 md:grid-cols-3">
        {QUOTES.map((q) => (
          <figure
            key={q.name}
            className="flex h-full flex-col rounded-lg border border-border/60 bg-card/40 p-8"
          >
            <blockquote className="flex-1 font-display text-xl leading-snug text-foreground">
              &ldquo;{q.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-6 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{q.name}</span> · {q.state}
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="mt-16 text-center">
        <Eyebrow tone="sage">Practiced in</Eyebrow>
        <ul className="mt-4 flex flex-wrap items-center justify-center gap-4 font-display text-lg text-muted-foreground">
          {STATES.map((s, i) => (
            <li key={s} className="flex items-center gap-4">
              <span>{s}</span>
              {i < STATES.length - 1 && (
                <span className="text-border" aria-hidden="true">
                  ·
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
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
    q: "What happens if Terapily goes down mid-session?",
    a: "Boards are drafted in your browser and synced to your encrypted workspace continuously. A connection blip doesn't lose your work — keep building, sync resumes when you're back online.",
    pillar: "Always evolving",
  },
  {
    q: "Will updates break my workflow?",
    a: "No. Terapily ships weekly behind a stable interface. The drag-and-drop you learn in week one works the same in year three.",
    pillar: "Always evolving",
  },
  {
    q: "How is this different from SimplePractice or TheraNest?",
    a: "Those are billing-and-admin systems with worksheets bolted on. Terapily is a clinical tool built for the session itself. We don't replace your EHR — we replace the whiteboard, the worksheet, and the photo-of-the-whiteboard.",
    pillar: "Built for clinical use",
  },
  {
    q: "Can I use this with adult clients?",
    a: "Yes. The card vocabulary works across ages — we lead with kids and teens because that's where visual CBT has the strongest evidence base, but the boards themselves are age-agnostic.",
    pillar: "Built for clinical use",
  },
  {
    q: "What if I cancel?",
    a: `Cancel any time from your account. Export your patient records as encrypted archives. We delete your data within 30 days of cancellation, per HIPAA retention guidance.`,
    pillar: "Professional-grade",
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
        next client.
      </h2>
      <p className="mx-auto mt-8 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
        {TRIAL_DURATION_DAYS}-day free trial. No credit card. Cancel anytime. Upgrade only if
        Terapily earns its place in your practice.
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
