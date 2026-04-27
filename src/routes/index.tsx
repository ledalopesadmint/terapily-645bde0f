import type { ReactNode, ComponentType } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Stethoscope, Send, Repeat } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { BRAND, TRIAL_DURATION_DAYS } from "@/lib/constants";
import { useAuth } from "@/features/auth/AuthProvider";
import iconSrc from "@/assets/terapily-icon.png";

/**
 * Pequeno satélite circular cream com ícone, em volta do ícone Terapily
 * central na seção "Terapily is the system that was missing".
 */
function SatelliteIcon({
  className,
  label,
  children,
}: {
  className?: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`flex h-12 w-12 items-center justify-center rounded-full bg-cream shadow-[0_8px_20px_-10px_oklch(0.28_0.027_251_/_0.4)] ring-1 ring-navy/5 ${className ?? ""}`}
      aria-label={label}
    >
      <svg
        aria-hidden="true"
        className="h-5 w-5 text-terracotta"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </div>
  );
}

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
  const primaryCtaTo = isAuthenticated ? "/dashboard" : "/signup";
  const ctaPrimaryLabel = isAuthenticated
    ? "Open my workspace"
    : `Start ${TRIAL_DURATION_DAYS}-day trial`;

  return (
    <div className="min-h-screen bg-background">
      {/* ============================================================ */}
      {/* HEADER */}
      {/* ============================================================ */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Logo size="sm" withIcon />
          <nav className="flex items-center gap-6 text-sm">
            <a
              href="#how-it-works"
              className="hidden text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              How it works
            </a>
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
              {isAuthenticated ? "Workspace" : "Start free"}
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* ============================================================ */}
        {/* 1 · HERO — Cream editorial, texto Navy, eyebrow terracotta   */}
        {/* ============================================================ */}
        <section className="relative overflow-hidden bg-background">
          <div className="relative mx-auto max-w-5xl px-6 pt-12 pb-12 text-center md:pt-16 md:pb-16">
            <Eyebrow tone="terracotta" className="text-[0.78rem]">
              Every activity grounded in published evidence
            </Eyebrow>

            <h1 className="mt-10 font-display text-[2.75rem] leading-[1.02] tracking-tight text-navy md:text-[5.25rem]">
              Therapeutic tools <br className="hidden md:block" />
              your clients <em className="italic font-display text-terracotta">actually</em> finish.
            </h1>

            <p className="mx-auto mt-10 max-w-2xl text-base leading-[1.65] text-navy/75 md:text-lg">
              Run validated scales and CBT activities live in session,
              send them home with a single secure link, or both. Every
              activity becomes a record you can actually use — without
              replacing your existing EHR.
            </p>

            <div className="mt-12 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                to={primaryCtaTo}
                className="inline-flex items-center justify-center rounded-2xl bg-navy px-7 py-3.5 text-sm font-medium text-cream shadow-[0_8px_24px_-12px_oklch(0.28_0.027_251_/_0.55)] transition-all hover:scale-[1.02] hover:bg-navy/95"
              >
                {ctaPrimaryLabel}
              </Link>
              {!isAuthenticated && (
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-2xl border border-navy/30 bg-transparent px-7 py-3.5 text-sm font-medium text-navy transition-colors hover:bg-navy/[0.04]"
                >
                  I already have an account
                </Link>
              )}
            </div>

            <p className="mt-7 text-xs text-navy/55">
              No card required • Cancel anytime • Operates under HIPAA Security Rule
            </p>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 1.5 · TRUST STRIP — Cream-tan + cards Navy editoriais         */}
        {/* ============================================================ */}
        <section className="bg-cream-tan">
          <div className="mx-auto max-w-6xl px-6 py-10 md:py-12">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <TrustFactInverted label="Validated scales" value="35" sub="Grounded in published evidence." />
              <TrustFactInverted label="Score to report" value="<3s" sub="Less admin. More care." />
              <TrustFactInverted label="Encryption at rest" value="AES-256" sub="Enterprise-grade security." />
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 2.5 · EMOTIONAL HOOK — bloco editorial, voz calma + dor real */}
        {/* ============================================================ */}
        <section className="relative overflow-hidden bg-gradient-to-br from-cream via-background to-cream-tan/60">
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 pt-12 pb-16 md:grid-cols-12 md:gap-10 md:pt-16 md:pb-20">
            {/* Coluna esquerda: display text com "They leave" destacado */}
            <div className="md:col-span-5">
              <Eyebrow tone="terracotta">The reality between sessions</Eyebrow>
              <h2 className="mt-8 font-display text-5xl leading-[1.02] tracking-tight text-navy md:text-[5.5rem]">
                You explain. <br />
                They nod. <br />
                <span className="relative inline-block text-terracotta">
                  They leave.
                  {/* Sublinhado riscado à mão */}
                  <svg
                    aria-hidden="true"
                    className="pointer-events-none absolute left-0 right-0 -bottom-3 h-3 w-full"
                    viewBox="0 0 300 12"
                    preserveAspectRatio="none"
                    fill="none"
                  >
                    <path
                      d="M2 7 C 60 2, 120 11, 180 5 S 280 8, 298 4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      className="text-terracotta/70"
                    />
                  </svg>
                </span>
              </h2>

              {/* Pill "Next session, nothing changed." */}
              <div className="group mt-12 inline-flex cursor-default items-center gap-3 rounded-2xl border border-navy/15 bg-background/70 px-5 py-3.5 shadow-[0_6px_20px_-10px_oklch(0.28_0.027_251_/_0.22)] backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-navy/25 hover:shadow-[0_14px_30px_-12px_oklch(0.28_0.027_251_/_0.32)]">
                <svg
                  aria-hidden="true"
                  className="h-4 w-4 text-terracotta"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                <span className="text-sm text-navy/80">Next session, nothing changed.</span>
              </div>
            </div>

            {/* Coluna central: bullet > + divider + parágrafo + frase de fechamento */}
            <div className="relative md:col-span-4">
              <div className="flex gap-5">
                {/* Coluna do bullet + linha vertical */}
                <div className="flex flex-col items-center pt-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-terracotta text-cream shadow-[0_4px_12px_-4px_oklch(0.665_0.082_65_/_0.45)]">
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                  <div
                    aria-hidden="true"
                    className="mt-3 w-px flex-1 border-l border-dashed border-terracotta/40"
                  />
                </div>

                {/* Conteúdo */}
                <div className="flex-1 pt-1">
                  <p className="text-base leading-[1.7] text-navy/80 font-sans">
                    Not because they don&rsquo;t care.
                    <br />
                    Because the system you were handed —{" "}
                    <strong className="font-semibold text-navy">printable PDFs, manual scoring,</strong>{" "}
                    no visibility between sessions — was never built to help
                    them follow through.
                  </p>

                  <p className="mt-10 font-display text-3xl leading-[1.15] text-navy md:text-[2.25rem]">
                    <span className="text-terracotta">terapily.</span> is the system
                    <br />
                    that was missing.
                  </p>
                </div>
              </div>
            </div>

            {/* Coluna direita: ícone Terapily com órbita pontilhada e satélites */}
            <div className="md:col-span-3">
              <div className="group relative mx-auto aspect-square w-full max-w-[320px]">
                {/* Órbita pontilhada */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full border border-dashed border-terracotta/35 transition-all duration-500 group-hover:scale-[1.03] group-hover:border-terracotta/55"
                />
                {/* Halo sutil */}
                <div
                  aria-hidden="true"
                  className="absolute inset-[14%] rounded-full bg-cream/70 shadow-[0_20px_50px_-20px_oklch(0.28_0.027_251_/_0.35)] transition-all duration-500 group-hover:shadow-[0_32px_70px_-22px_oklch(0.28_0.027_251_/_0.5)]"
                />
                {/* Ícone central */}
                <div className="absolute inset-[18%] flex items-center justify-center transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-[1.04]">
                  <img
                    src={iconSrc}
                    alt="Terapily"
                    className="h-full w-full object-contain drop-shadow-[0_12px_24px_oklch(0.28_0.027_251_/_0.35)] transition-all duration-500 group-hover:drop-shadow-[0_22px_36px_oklch(0.28_0.027_251_/_0.5)]"
                    draggable={false}
                  />
                </div>

                {/* Satélites */}
                <SatelliteIcon
                  className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2"
                  label="Clipboard"
                >
                  <path d="M9 4h6a1 1 0 0 1 1 1v1h2a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h2V5a1 1 0 0 1 1-1Z" />
                  <path d="M9 11h6M9 15h6" />
                </SatelliteIcon>
                <SatelliteIcon
                  className="absolute left-0 bottom-[12%] -translate-x-1/2"
                  label="People"
                >
                  <circle cx="9" cy="9" r="3" />
                  <circle cx="17" cy="11" r="2.5" />
                  <path d="M3 19c0-3 3-5 6-5s6 2 6 5M14 19c0-2 2-3.5 4-3.5s4 1.5 4 3.5" />
                </SatelliteIcon>
                <SatelliteIcon
                  className="absolute right-0 bottom-[12%] translate-x-1/2"
                  label="Chart"
                >
                  <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
                </SatelliteIcon>
              </div>
            </div>
          </div>

          {/* Benefit pills mantidos abaixo */}
          <div className="mx-auto max-w-6xl px-6 pb-24">
            <div className="grid grid-cols-1 gap-6 text-left sm:grid-cols-3">
              <BenefitPill title="Less manual work" body="Auto-scoring, magic-link delivery, one-click reports." />
              <BenefitPill title="More follow-through" body="Activities clients open on any device — no account, no app." />
              <BenefitPill title="Records that hold up" body="Every read, edit, and export logged. Exportable on demand." />
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 3 · PROBLEM — comparativo "antes / depois", didático e calmo */}
        {/* ============================================================ */}
        <section className="bg-cream-tan">
          <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="text-center">
            <Eyebrow tone="terracotta">The reality between sessions</Eyebrow>
            <h2 className="mt-6 font-display text-4xl leading-[1.05] text-foreground md:text-5xl">
              Most <em className="italic font-display text-terracotta">homework</em> never comes back. <br className="hidden md:block" />
              Most <em className="italic font-display text-terracotta">paperwork</em> never gets scored.
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
              Same three gaps, every week — until the system itself changes.
            </p>
          </div>

          {/* Tabela comparativa */}
          <div className="mt-16 overflow-hidden rounded-3xl border border-border/60 bg-background shadow-[0_24px_70px_-30px_oklch(0.28_0.027_251_/_0.35)] ring-1 ring-terracotta/10">
            {/* Header da tabela */}
            <div className="grid grid-cols-12 gap-0 border-b-2 border-terracotta/20 bg-navy">
              <div className="col-span-4 px-6 py-5 md:px-8">
                <p className="eyebrow text-[0.7rem] text-cream">The gap</p>
              </div>
              <div className="col-span-4 border-l border-cream/10 px-6 py-5 md:px-8">
                <p className="eyebrow text-[0.7rem] text-cream/70">
                  The system you were handed
                </p>
              </div>
              <div className="col-span-4 border-l border-cream/10 bg-terracotta/95 px-6 py-5 md:px-8">
                <p className="eyebrow text-[0.7rem] text-cream">
                  With Terapily
                </p>
              </div>
            </div>

            <ProblemRow
              gap="Compliance"
              before="A folder of PDFs and a memory of last Tuesday — when an auditor or supervisor asks what you did and when."
              after="Every read, edit, and export logged. Exportable on demand."
            />
            <ProblemRow
              gap="Engagement"
              before="Static worksheets feel like school. Folded, lost, or filled out in the waiting room two minutes before your session."
              after="Activities clients open on any device — no account, no app, no friction."
            />
            <ProblemRow
              gap="Signal"
              before="PHQ-9, GAD-7, PCL-5 — same scoring math, every patient, every week. Your evenings, gone."
              after="Auto-scored in under 3 seconds. The math is not your problem anymore."
              isLast
            />
          </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 4 · 3 MODOS DE USO — diferencial único no mercado */}
        {/* ============================================================ */}
        <section className="border-t border-border/60 bg-card/40">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <div className="text-center">
              <Eyebrow tone="sage">Three ways to use any activity</Eyebrow>
              <h2 className="mt-6 font-display text-4xl text-foreground md:text-5xl">
                Your <em className="italic font-display text-terracotta">session.</em>{" "}
                Your <em className="italic font-display text-terracotta">call.</em>
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
                Every activity in Terapily — a validated scale, a CBT
                exercise, a thought record — works in three modes.
                You decide which one fits the moment.
              </p>
            </div>

            <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
              <ModeCard
                icon={Stethoscope}
                tag="Mode 01"
                title="In session"
                body='Run the activity <strong class="font-display italic text-terracotta">live</strong> on your screen, on a tablet, or read the items aloud. Scoring and report appear <strong class="font-display italic text-terracotta">before</strong> the client leaves the room.'
                useCase="Use when you want to anchor a clinical decision in the same hour."
              />
              <ModeCard
                icon={Send}
                tag="Mode 02"
                title="Sent home"
                body='Generate a <strong class="font-display italic text-terracotta">secure single-use link.</strong> Your client opens it on any device — no account, no app to download, no password to forget. Default link expiry: <strong class="font-display italic text-terracotta">24 hours.</strong>'
                useCase="Use for between-session homework, weekly tracking, intake forms."
              />
              <ModeCard
                icon={Repeat}
                tag="Mode 03"
                title="Both"
                body='Apply it together in session, then send the same activity home for <strong class="font-display italic text-terracotta">repeat measurement.</strong> Results stack into a <strong class="font-display italic text-terracotta">single timeline</strong> on the patient&rsquo;s record.'
                useCase="Use to measure change between two points without re-explaining the tool."
              />
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 5 · HOW IT WORKS — 4 steps */}
        {/* ============================================================ */}
        <section id="how-it-works" className="mx-auto max-w-5xl px-6 py-16">
          <div className="text-center">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-6 font-display text-4xl text-foreground md:text-5xl">
              From assignment to audit trail in four steps.
            </h2>
          </div>

          <ol className="mt-16 grid grid-cols-1 gap-10 md:grid-cols-4">
            <Step
              number="01"
              title="Pick the activity"
              body="Search by name (PHQ-9), category (anxiety), or population (adolescents). Choose any of the three delivery modes."
            />
            <Step
              number="02"
              title="Send or apply"
              body="Apply it on your device, or click Send. The patient gets one secure link by email — or copy it and share on any channel. No signup, no app install."
            />
            <Step
              number="03"
              title="Auto-scored"
              body="Submission triggers scoring, severity bands, and a one-page report. You get notified when it lands."
            />
            <Step
              number="04"
              title="On the record"
              body="Results live on the patient&rsquo;s timeline with a tamper-evident audit trail. Export to PDF or attach to your EHR anytime."
            />
          </ol>
        </section>

        {/* ============================================================ */}
        {/* 6 · VALIDATED ASSESSMENTS — mantido */}
        {/* ============================================================ */}
        <section className="border-t border-border/60 bg-card/40">
          <div className="mx-auto max-w-4xl px-6 py-16 text-center">
            <Eyebrow tone="sage">Validated assessments · Built in</Eyebrow>
            <h2 className="mt-6 font-display text-4xl text-foreground md:text-5xl">
              The scales you already use. <br className="hidden md:block" />
              Scored for you.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
              35 evidence-based screening tools — PHQ-9, GAD-7, PCL-5
              and many more — delivered as interactive activities with
              auto-scoring, severity bands, and a one-page report. No
              spreadsheets. No manual math. No per-assessment licensing
              fees passed to you.
            </p>

            <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-6 text-left sm:grid-cols-4">
              <KeyStat value="35" label="Validated scales" />
              <KeyStat value="$0" label="Per-assessment fees" />
              <KeyStat value="<3s" label="Score to report" />
              <KeyStat value="100%" label="Original wording preserved" />
            </div>

            <details className="group mx-auto mt-12 max-w-3xl rounded-2xl border border-border/60 bg-card/60 text-left backdrop-blur-sm">
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
                  Every assessment is delivered with original validated
                  wording, full attribution to its authors, and a clear
                  disclaimer that results are screening indicators —
                  never diagnostic conclusions. Clinical judgment always
                  belongs to you.
                </p>
              </div>
            </details>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 7 · WHERE IT FITS — não substitui EHR */}
        {/* ============================================================ */}
        <section className="mx-auto max-w-5xl px-6 py-16">
          <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2">
            <div>
              <Eyebrow tone="mauve">Where Terapily fits</Eyebrow>
              <h2 className="mt-6 font-display text-4xl text-foreground md:text-5xl">
                We don&rsquo;t replace your EHR. We complete it.
              </h2>
              <p className="mt-6 text-base leading-relaxed text-muted-foreground">
                If you already use SimplePractice, TherapyNotes, or
                another practice management system, keep it. Terapily
                lives next to your EHR — handling the part it was never
                built for: dynamic activities, validated scales, and
                between-session work.
              </p>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Export any report as a PDF and attach it to the patient
                file you already maintain. No double entry. No migration
                weekend. No vendor lock-in.
              </p>
            </div>

            <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-8">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Your stack with Terapily
              </p>
              <div className="mt-6 space-y-4">
                <StackRow role="Practice management, scheduling, billing" tool="Your EHR" />
                <StackRow role="Therapeutic activities &amp; validated scales" tool="Terapily" highlight />
                <StackRow role="Telehealth video" tool="Your video tool" />
                <StackRow role="Notes &amp; treatment plans" tool="Your EHR" />
                <StackRow role="Compliance evidence (per workspace)" tool="Terapily report" highlight />
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 8 · COMPLIANCE & TRUST — 5 fatos verificáveis */}
        {/* ============================================================ */}
        <section className="border-t border-border/60 bg-card/40">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <div className="text-center">
              <Eyebrow tone="sage">Compliance &amp; trust</Eyebrow>
              <h2 className="mt-6 font-display text-4xl text-foreground md:text-5xl">
                Things we can show, not just say.
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
                HIPAA has no certification body. Anyone claiming to be
                &ldquo;HIPAA-certified&rdquo; is either confused or selling you a
                story. Here is what we actually do — verifiable, every line.
              </p>
            </div>

            <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
              <TrustCard
                title="Encryption you can name"
                body="AES-256-GCM at rest. TLS 1.3 in transit. Per-workspace data isolation enforced at the database row level (RLS). No shared tenant tables."
              />
              <TrustCard
                title="A signed BAA, on request"
                body="Business Associate Agreement available before you sign up — readable in plain language, with a list of every subprocessor that touches PHI."
              />
              <TrustCard
                title="Append-only audit trail"
                body="Every read, edit, send, and export of patient data is logged with actor, timestamp, and target. Logs cannot be modified or deleted from the app — only by Postgres role escalation, which is restricted."
              />
              <TrustCard
                title="Magic link, no patient account"
                body="Patients access their activities through a single-use link with a SHA-256 token hash and a default 24-hour expiry. No email/password store. No mobile app to lose."
              />
              <TrustCard
                title="Configurable retention"
                body="You set how long records live, with a 6-year HIPAA floor. Auto-purge runs on schedule with a downloadable JSON+PDF export sent to you 30 days before any deletion."
              />
              <TrustCard
                title="Your data, exportable"
                body="Cancel any time and request a full archive — JSON for raw data, PDF for human-readable records — delivered within 7 days. No exit fee, no negotiation."
              />
            </div>

            <p className="mx-auto mt-10 max-w-3xl text-center text-xs leading-relaxed text-muted-foreground">
              Terapily operates under HIPAA Security Rule and signs BAAs
              with every clinician who handles PHI. HIPAA compliance is
              a shared responsibility — final accountability rests with
              each Covered Entity.
            </p>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 9 · COMPARED — tabela honesta */}
        {/* ============================================================ */}
        <section className="mx-auto max-w-5xl px-6 py-16">
          <div className="text-center">
            <Eyebrow>Compared to alternatives</Eyebrow>
            <h2 className="mt-6 font-display text-4xl text-foreground md:text-5xl">
              An honest side-by-side.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
              Public landing pages reviewed April 27, 2026. We&rsquo;ll
              update this table as competitors update theirs.
            </p>
          </div>

          <div className="mt-12 overflow-hidden rounded-2xl border border-border/60">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-card/60 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-4 font-medium">Capability</th>
                  <th className="px-6 py-4 font-medium text-foreground">Terapily</th>
                  <th className="px-6 py-4 font-medium">Static PDF libraries</th>
                  <th className="px-6 py-4 font-medium">Homework platforms</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                <CompareRow capability="Auto-scored validated scales (PHQ-9, GAD-7, PCL-5...)" terapily="35 built-in" alt1="No" alt2="Some, varies" />
                <CompareRow capability="Use the same activity in session AND between sessions" terapily="Yes" alt1="Manual" alt2="Between only" />
                <CompareRow capability="Patient access without creating an account" terapily="Magic link, 24h expiry" alt1="N/A" alt2="Account required" />
                <CompareRow capability="Configurable data retention with auto-purge" terapily="Yes, with export" alt1="No" alt2="Rarely published" />
                <CompareRow capability="Exportable compliance report (audit + retention + BAAs)" terapily="Practice plan" alt1="No" alt2="No" />
                <CompareRow capability="Public BAA + subprocessor list" terapily="Yes" alt1="N/A" alt2="On request only" />
                <CompareRow capability="Replaces your EHR" terapily="No, complements it" alt1="N/A" alt2="Sometimes claims to" />
              </tbody>
            </table>
          </div>

          <p className="mx-auto mt-6 max-w-3xl text-center text-xs text-muted-foreground">
            &ldquo;Static PDF libraries&rdquo; refers to subscription worksheet
            sites. &ldquo;Homework platforms&rdquo; refers to between-session
            engagement tools that require patient accounts. We&rsquo;re happy
            to update specific competitor names with their permission.
          </p>
        </section>

        {/* ============================================================ */}
        {/* 10 · PRICING */}
        {/* ============================================================ */}
        <section id="pricing" className="border-t border-border/60 bg-card/40">
          <div className="mx-auto max-w-5xl px-6 py-16">
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
              <div className="flex flex-col rounded-2xl border border-border/60 bg-card/60 p-8 backdrop-blur-sm">
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
                  <PricingItem>AES-256-GCM at rest · TLS 1.3 in transit</PricingItem>
                  <PricingItem>Append-only audit log</PricingItem>
                  <PricingItem>Default retention policy (workspace-wide)</PricingItem>
                </ul>
                <Link
                  to={primaryCtaTo}
                  className="mt-10 inline-flex items-center justify-center rounded-md border border-border bg-background px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  {ctaPrimaryLabel}
                </Link>
              </div>

              {/* Practice — destacado */}
              <div className="relative flex flex-col rounded-2xl border-2 border-primary bg-card/80 backdrop-blur-sm p-8 shadow-lg md:scale-[1.02]">
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
                  <PricingItem>Configurable retention with state &amp; minor overrides</PricingItem>
                  <PricingItem>
                    Exportable compliance report — retention policy,
                    audit trail, subprocessor BAAs, automated purge log
                  </PricingItem>
                </ul>
                <Link
                  to={primaryCtaTo}
                  className="mt-10 inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  {ctaPrimaryLabel}
                </Link>
              </div>
            </div>

            <p className="mx-auto mt-10 max-w-3xl text-center text-xs leading-relaxed text-muted-foreground">
              No card required to start · Cancel anytime · Prices in
              USD · Multi-clinician (Clinic) plan in development.
            </p>

            <p className="mx-auto mt-4 max-w-3xl text-center text-xs leading-relaxed text-muted-foreground">
              The compliance report aggregates your existing data into
              a format you can share with your auditor or attorney.
              It is not a certification, not a substitute for legal
              review, and not a guarantee of HIPAA compliance — that
              responsibility remains with each Covered Entity.
            </p>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 11 · FAQ — 10 perguntas obrigatórias */}
        {/* ============================================================ */}
        <section id="faq" className="mx-auto max-w-3xl px-6 py-16">
          <div className="text-center">
            <Eyebrow>FAQ</Eyebrow>
            <h2 className="mt-6 font-display text-4xl text-foreground md:text-5xl">
              The questions clinicians actually ask.
            </h2>
          </div>

          <div className="mt-14 space-y-3">
            <Faq
              q="Does Terapily replace SimplePractice or TherapyNotes?"
              a="No. Terapily lives next to your EHR. We handle activities, validated scales, and between-session work; your EHR keeps doing scheduling, billing, and notes. Reports export as PDF — attach them to the patient file you already maintain."
            />
            <Faq
              q="How do patients access their activities?"
              a="Through a single-use magic link delivered by email or SMS. They open it on any device — no signup, no app to install, no password to remember. The link is hashed (SHA-256) and expires in 24 hours by default; you can shorten it per workspace."
            />
            <Faq
              q="Are you HIPAA-certified?"
              a="HIPAA has no official certification — anyone claiming otherwise is mistaken. Terapily operates under HIPAA Security Rule, signs BAAs with clinicians and with every subprocessor that touches PHI, and publishes our security architecture. Final HIPAA accountability rests with each Covered Entity."
            />
            <Faq
              q="How long do you keep patient data?"
              a="As long as you say, with a 6-year HIPAA floor. Retention is configurable per workspace. When a record is scheduled for auto-purge, you receive a downloadable JSON+PDF export 30 days before deletion — no surprises."
            />
            <Faq
              q="What happens if I cancel?"
              a="Within 7 days of your request, we deliver a full archive — JSON for raw data, PDF for human-readable records — and disable access. No exit fee, no friction."
            />
            <Faq
              q="Do you use AI on patient data?"
              a="Not on Protected Health Information. PHI never leaves our infrastructure to train external models. We use lightweight summarization on de-identified metadata when it helps you read a report faster — and always with that summarization clearly labeled."
            />
            <Faq
              q="Will I have to migrate my existing notes?"
              a="No. Terapily handles new activities and scales going forward. Your historical notes stay in your EHR. There is no &lsquo;migration weekend&rsquo;."
            />
            <Faq
              q="Is the activity library really for adolescents and adults?"
              a="Yes. Activities and scales are tagged by validated age range. Adolescent-specific tools (PHQ-A, GAD-7 for teens, PSC-Y) are flagged in the catalog. We do not include tools we cannot license openly."
            />
            <Faq
              q="What if my supervisor or board asks for my records?"
              a="On the Practice plan, the exportable compliance report bundles your retention policy, audit trail of every patient interaction, list of subprocessors with BAAs, and any auto-purge events. Hand it over as a PDF."
            />
          </div>
        </section>

        {/* ============================================================ */}
        {/* 12 · CLOSING CTA */}
        {/* ============================================================ */}
        <section className="border-t border-border/60 bg-card/40">
          <div className="mx-auto max-w-3xl px-6 py-16 text-center">
            <Eyebrow tone="mauve">Start when you&rsquo;re ready</Eyebrow>
            <h2 className="mt-6 font-display text-4xl text-foreground md:text-5xl">
              The same activity. <br className="hidden md:block" />
              In session, at home, or both.
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
              Try Terapily for {TRIAL_DURATION_DAYS} days. No card.
              No commitment. If it doesn&rsquo;t fit your practice,
              walk away with your data.
            </p>
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                to={primaryCtaTo}
                className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {ctaPrimaryLabel}
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
              No card required · Cancel anytime · Operates under HIPAA Security Rule
            </p>
          </div>
        </section>
      </main>

      {/* ============================================================ */}
      {/* FOOTER */}
      {/* ============================================================ */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 text-xs text-muted-foreground">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p>© {new Date().getFullYear()} {BRAND.name}. Built with clinical rigor, one decision at a time.</p>
            <p className="font-medium">{BRAND.tagline}</p>
          </div>
          <div className="border-t border-border/40 pt-6 text-center sm:text-left">
            <p>TLS 1.3 in transit · AES-256-GCM at rest · Built to support HIPAA compliance</p>
            <p className="mt-2">
              Terapily is a software platform for licensed mental health
              clinicians. It does not provide medical, legal, or
              regulatory advice. Clinical judgment always belongs to
              the clinician.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ============================================================ */
/* SUB-COMPONENTS                                                */
/* ============================================================ */

function BenefitPill({ title, body }: { title: string; body: string }) {
  return (
    <div className="group rounded-2xl border border-border/50 bg-card/70 p-6 shadow-[0_6px_20px_-10px_oklch(0.28_0.027_251_/_0.18)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-card/90 hover:shadow-[0_14px_30px_-12px_oklch(0.28_0.027_251_/_0.28)]">
      <p className="font-display text-xl font-semibold text-foreground md:text-[1.4rem]">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function TrustFact({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-display text-3xl text-foreground md:text-4xl">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

/**
 * Card editorial Navy da faixa de stats (estilo screenshot).
 * Cormorant gigante em Cream + label ALL CAPS com régua + sub-line.
 */
function TrustFactInverted({
  value,
  label,
  sub,
}: {
  value: string;
  label: string;
  sub?: string;
}) {
  return (
    <div className="rounded-[1.5rem] bg-navy px-7 py-7 shadow-[0_6px_20px_-10px_oklch(0.28_0.027_251_/_0.28)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-12px_oklch(0.28_0.027_251_/_0.38)]">
      <p className="font-display text-4xl leading-none text-cream md:text-[2.75rem]">
        {value}
      </p>
      <p
        className="mt-4 text-[0.65rem] font-bold uppercase text-cream/85"
        style={{ letterSpacing: "0.14em" }}
      >
        {label}
      </p>
      <div className="mt-2.5 h-px w-full bg-cream/15" />
      {sub && (
        <p className="mt-3.5 text-[0.8125rem] leading-relaxed text-cream/65">{sub}</p>
      )}
    </div>
  );
}

function ProblemCard({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h3
        className="mt-3 font-display text-xl text-foreground"
        dangerouslySetInnerHTML={{ __html: title }}
      />
      <p
        className="mt-3 text-sm leading-relaxed text-muted-foreground"
        dangerouslySetInnerHTML={{ __html: body }}
      />
    </div>
  );
}

/**
 * Linha do comparativo "antes / depois" da seção problem.
 * 3 colunas: gap (label) | the system you were handed | with Terapily.
 */
function ProblemRow({
  gap,
  before,
  after,
  isLast = false,
}: {
  gap: string;
  before: string;
  after: string;
  isLast?: boolean;
}) {
  const borderClass = isLast ? "" : "border-b border-border/60";
  return (
    <div className={`group grid grid-cols-12 gap-0 transition-colors ${borderClass}`}>
      {/* Coluna 1: gap */}
      <div className="col-span-4 flex items-center bg-cream-tan/60 px-6 py-7 transition-colors group-hover:bg-cream-tan/90 md:px-8">
        <p className="font-display text-xl text-navy md:text-2xl">{gap}</p>
      </div>

      {/* Coluna 2: antes */}
      <div className="col-span-4 border-l border-border/60 bg-background px-6 py-7 transition-colors group-hover:bg-background/70 md:px-8">
        <p className="text-sm leading-relaxed text-muted-foreground line-through decoration-terracotta/40 decoration-1">
          {before}
        </p>
      </div>

      {/* Coluna 3: depois */}
      <div className="col-span-4 border-l border-border/60 bg-terracotta/[0.06] px-6 py-7 transition-colors group-hover:bg-terracotta/[0.12] md:px-8">
        <div className="flex gap-3">
          <span
            aria-hidden="true"
            className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-terracotta text-cream"
          >
            <svg
              className="h-3 w-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
          </span>
          <p className="text-sm leading-relaxed text-navy font-medium">{after}</p>
        </div>
      </div>
    </div>
  );
}

function ModeCard({
  icon: Icon,
  tag,
  title,
  body,
  useCase,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  tag: string;
  title: string;
  body: string;
  useCase: string;
}) {
  return (
    <div className="group relative flex h-full flex-col rounded-2xl border border-border/60 bg-background p-8 text-center shadow-[0_18px_50px_-24px_oklch(0.28_0.027_251_/_0.28)] ring-1 ring-terracotta/5 transition-all duration-300 hover:-translate-y-1 hover:border-terracotta/30 hover:shadow-[0_28px_70px_-28px_oklch(0.28_0.027_251_/_0.45)] hover:ring-terracotta/15">
      {/* Ícone centralizado */}
      <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-cream-tan/70 ring-1 ring-terracotta/15 transition-colors group-hover:bg-terracotta/10 group-hover:ring-terracotta/30">
        <Icon className="h-6 w-6 text-terracotta" strokeWidth={1.6} />
      </div>

      <div className="flex justify-center">
        <Eyebrow tone="sage">{tag}</Eyebrow>
      </div>
      <h3 className="mt-3 font-display text-2xl text-navy md:text-3xl">{title}</h3>
      <p
        className="mt-4 text-sm leading-relaxed text-muted-foreground"
        dangerouslySetInnerHTML={{ __html: body }}
      />
      <p className="mt-6 border-t border-terracotta/15 pt-4 text-xs italic leading-relaxed text-navy/70">
        {useCase}
      </p>
    </div>
  );
}

function Step({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <li>
      <p className="font-display text-3xl text-primary">{number}</p>
      <h3 className="mt-3 font-display text-lg text-foreground">{title}</h3>
      <p
        className="mt-2 text-sm leading-relaxed text-muted-foreground"
        dangerouslySetInnerHTML={{ __html: body }}
      />
    </li>
  );
}

function KeyStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-display text-3xl text-foreground">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function StackRow({
  role,
  tool,
  highlight,
}: {
  role: string;
  tool: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/40 pb-3 last:border-b-0 last:pb-0">
      <span
        className="text-sm text-muted-foreground"
        dangerouslySetInnerHTML={{ __html: role }}
      />
      <span
        className={
          highlight
            ? "shrink-0 text-sm font-medium text-primary"
            : "shrink-0 text-sm font-medium text-foreground"
        }
      >
        {tool}
      </span>
    </div>
  );
}

function TrustCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm">
      <h3 className="font-display text-xl text-foreground">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function CompareRow({
  capability,
  terapily,
  alt1,
  alt2,
}: {
  capability: string;
  terapily: string;
  alt1: string;
  alt2: string;
}) {
  return (
    <tr>
      <td className="px-6 py-4 align-top text-sm text-foreground">{capability}</td>
      <td className="px-6 py-4 align-top text-sm font-medium text-primary">{terapily}</td>
      <td className="px-6 py-4 align-top text-sm text-muted-foreground">{alt1}</td>
      <td className="px-6 py-4 align-top text-sm text-muted-foreground">{alt2}</td>
    </tr>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm">
      <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-5 text-sm font-medium text-foreground transition-colors hover:bg-muted/40">
        <span dangerouslySetInnerHTML={{ __html: q }} />
        <span className="text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true">▾</span>
      </summary>
      <p
        className="border-t border-border/40 px-6 py-5 text-sm leading-relaxed text-muted-foreground"
        dangerouslySetInnerHTML={{ __html: a }}
      />
    </details>
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

function PricingItem({ children }: { children: ReactNode }) {
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

