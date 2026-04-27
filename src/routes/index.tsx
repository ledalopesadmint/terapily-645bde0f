import type { ReactNode, ComponentType } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Stethoscope, Send, Repeat, Search, Sparkles, ShieldCheck, Lock, FileSignature, ScrollText, Link2, Clock, Download } from "lucide-react";
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

            <p className="mt-7 text-xs text-navy/55 font-bold">
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
        <section id="how-it-works" className="bg-cream-tan/40 border-t border-border/60">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="text-center">
              <Eyebrow tone="terracotta">How it works</Eyebrow>
              <h2 className="mt-6 font-display text-4xl text-foreground md:text-5xl">
                From <em className="italic font-display text-terracotta">assignment</em> to{" "}
                <em className="italic font-display text-terracotta">audit trail</em>{" "}
                in four steps.
              </h2>
            </div>

            {/* Linha conectora horizontal — só desktop */}
            <div className="relative mt-20">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-9 hidden md:block"
              >
                <svg className="h-2 w-full" preserveAspectRatio="none" viewBox="0 0 100 2">
                  <line
                    x1="0" y1="1" x2="100" y2="1"
                    stroke="currentColor"
                    className="text-terracotta/30"
                    strokeWidth="0.4"
                    strokeDasharray="1.2 1.2"
                  />
                </svg>
              </div>

              <ol className="relative grid grid-cols-1 gap-12 md:grid-cols-4 md:gap-6">
                <Step
                  icon={Search}
                  number="01"
                  title="Pick the activity"
                  body='Search by <strong class="font-display italic text-terracotta">name</strong> (PHQ-9), <strong class="font-display italic text-terracotta">category</strong> (anxiety), or <strong class="font-display italic text-terracotta">population</strong> (adolescents). Choose any of the three delivery modes.'
                />
                <Step
                  icon={Send}
                  number="02"
                  title="Send or apply"
                  body='Apply it on your device, or click <strong class="font-display italic text-terracotta">Send.</strong> The patient gets one secure link by email — or copy and share on any channel. <strong class="font-display italic text-terracotta">No signup, no app.</strong>'
                />
                <Step
                  icon={Sparkles}
                  number="03"
                  title="Auto-scored"
                  body='Submission triggers scoring, <strong class="font-display italic text-terracotta">severity bands,</strong> and a <strong class="font-display italic text-terracotta">one-page report.</strong> You get notified when it lands.'
                />
                <Step
                  icon={ShieldCheck}
                  number="04"
                  title="On the record"
                  body='Results live on the patient&rsquo;s timeline with a <strong class="font-display italic text-terracotta">tamper-evident audit trail.</strong> Export to PDF or attach to your EHR anytime.'
                />
              </ol>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 6 · VALIDATED ASSESSMENTS — mantido */}
        {/* ============================================================ */}
        <section className="border-t border-border/60 bg-background">
          <div className="mx-auto max-w-5xl px-6 py-16 text-center">
            <Eyebrow tone="sage">Validated assessments · Built in</Eyebrow>
            <h2 className="mt-6 font-display text-4xl text-foreground md:text-5xl">
              The scales you <em className="italic font-display text-terracotta">already</em> use. <br className="hidden md:block" />
              <em className="italic font-display text-terracotta">Scored</em> for you.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
              <strong className="font-display text-2xl italic font-semibold leading-none text-terracotta align-baseline md:text-3xl">35</strong> evidence-based screening tools — PHQ-9, GAD-7, PCL-5
              and many more — delivered as interactive activities with
              auto-scoring, severity bands, and a one-page report.{" "}
              <span className="text-navy">No spreadsheets. No manual math. No per-assessment licensing fees passed to you.</span>
            </p>

            <div className="mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-5">
              <KeyStat value="35" label="Validated scales" />
              <KeyStat value="$0" label="Per-assessment fees" />
              <KeyStat value="<3s" label="Score to report" />
              <KeyStat value="100%" label="Original wording preserved" />
            </div>

          </div>

          {/* Faixa navy full-width — trigger do accordion */}
          <details className="group block w-full">
            <summary className="flex w-full cursor-pointer list-none items-center justify-between gap-4 border-y border-navy bg-navy px-6 py-5 text-cream transition-colors hover:bg-navy/95 md:px-12">
              <span className="flex items-center gap-5">
                <span className="font-display text-3xl italic leading-none text-terracotta md:text-4xl">35</span>
                <span className="text-xs font-medium uppercase tracking-[0.2em] md:text-sm">
                  See the full library of auto-scored assessments
                </span>
              </span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-terracotta/20 text-terracotta transition-transform group-open:rotate-180" aria-hidden="true">▾</span>
            </summary>

            {/* Painel expandido — fundo cream-tan claro */}
            <div className="bg-cream-tan/60 border-b border-border/60">
              <div className="mx-auto max-w-5xl space-y-8 px-6 py-12 text-left md:px-12">
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
            </div>
          </details>
        </section>

        {/* ============================================================ */}
        {/* 7 · WHERE IT FITS — não substitui EHR */}
        {/* ============================================================ */}
        <section className="relative overflow-hidden bg-gradient-to-br from-cream-tan/60 via-background to-cream-tan/40 border-t border-border/60">
          {/* Decorative serif glyph */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 top-10 select-none font-display italic text-[18rem] leading-none text-navy/[0.04] md:-right-20 md:text-[26rem]"
          >
            +
          </div>

          <div className="relative mx-auto max-w-6xl px-6 py-20 md:py-28">
            <div className="grid grid-cols-1 items-start gap-14 md:grid-cols-12 md:gap-16">
              {/* Left: copy */}
              <div className="md:col-span-5">
                <Eyebrow tone="mauve">Where Terapily fits</Eyebrow>
                <h2 className="mt-6 font-display text-4xl leading-[1.05] text-foreground md:text-5xl">
                  We don&rsquo;t replace your EHR.
                  <br />
                  <span className="italic text-terracotta">We complete it.</span>
                </h2>
                <p className="mt-8 text-base leading-relaxed text-muted-foreground">
                  If you already use SimplePractice, TherapyNotes, or
                  another practice management system, keep it. Terapily
                  lives next to your EHR — handling the part it was
                  never built for: dynamic activities, validated scales,
                  and between-session work.
                </p>

                {/* Three honest promises */}
                <ul className="mt-8 space-y-3">
                  {[
                    "No double entry",
                    "No migration weekend",
                    "No vendor lock-in",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-3 text-sm text-foreground"
                    >
                      <span
                        aria-hidden
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-sage/40 bg-sage/10 font-display text-xs italic text-sage"
                      >
                        ✓
                      </span>
                      <span className="font-medium">{item}</span>
                    </li>
                  ))}
                </ul>

                <p className="mt-8 text-sm leading-relaxed text-muted-foreground">
                  Export any report as a PDF and attach it to the
                  patient file you already maintain.
                </p>
              </div>

              {/* Right: stack diagram */}
              <div className="md:col-span-7">
                <div className="relative rounded-3xl border border-navy/10 bg-card/80 p-6 shadow-[0_30px_80px_-40px_rgba(31,42,54,0.35)] backdrop-blur-sm md:p-10">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-border/50 pb-5">
                    <div>
                      <p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                        Your stack
                      </p>
                      <p className="mt-1 font-display text-lg italic text-foreground">
                        with Terapily
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-[0.65rem] uppercase tracking-[0.18em]">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                        Yours
                      </span>
                      <span className="flex items-center gap-1.5 text-terracotta">
                        <span className="h-2 w-2 rounded-full bg-terracotta" />
                        Terapily
                      </span>
                    </div>
                  </div>

                  {/* Stack rows */}
                  <ol className="mt-2 divide-y divide-border/40">
                    <StackRow
                      index="01"
                      role="Practice management, scheduling, billing"
                      tool="Your EHR"
                    />
                    <StackRow
                      index="02"
                      role="Therapeutic activities &amp; validated scales"
                      tool="Terapily"
                      highlight
                    />
                    <StackRow
                      index="03"
                      role="Telehealth video"
                      tool="Your video tool"
                    />
                    <StackRow
                      index="04"
                      role="Notes &amp; treatment plans"
                      tool="Your EHR"
                    />
                    <StackRow
                      index="05"
                      role="Compliance evidence (per workspace)"
                      tool="Terapily report"
                      highlight
                    />
                  </ol>

                  {/* Footer caption */}
                  <p className="mt-6 border-t border-border/40 pt-5 text-xs leading-relaxed text-muted-foreground font-bold">
                    Two highlighted rows. Everything else stays exactly
                    where it already lives.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 8 · COMPLIANCE & TRUST — 5 fatos verificáveis */}
        {/* ============================================================ */}
        <section className="relative overflow-hidden border-t border-navy/20 bg-navy text-cream">
          {/* Decorative serif glyph */}
          <div
            aria-hidden
            className="pointer-events-none absolute -left-10 top-8 select-none font-display italic text-[18rem] leading-none text-cream/[0.04] md:-left-16 md:text-[26rem]"
          >
            §
          </div>
          {/* Soft sage glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-32 bottom-0 h-[28rem] w-[28rem] rounded-full bg-sage/10 blur-3xl"
          />

          <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-12 md:pt-28 md:pb-16">
            <div className="grid grid-cols-1 items-end gap-10 md:grid-cols-12">
              <div className="md:col-span-7">
                <Eyebrow tone="sage">Compliance &amp; trust</Eyebrow>
                <h2 className="mt-6 font-display text-4xl leading-[1.05] text-cream md:text-5xl">
                  Things we can show,
                  <br />
                  <span className="italic text-terracotta">not just say.</span>
                </h2>
              </div>
              <div className="md:col-span-5">
                <p className="text-base leading-relaxed text-cream/70 text-center">
                  HIPAA has no certification body. Anyone claiming to be
                  &ldquo;HIPAA-certified&rdquo; is either confused or
                  selling you a story. Here is what we actually do —
                  verifiable, every line.
                </p>
              </div>
            </div>

            <div className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-3xl border border-navy/10 bg-navy/10 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.5)] md:grid-cols-2 lg:grid-cols-3">
              <TrustCard
                icon={Lock}
                title="Encryption you can name"
                proof="AES-256-GCM · TLS 1.3 · RLS"
                body="At rest and in transit. Per-workspace data isolation enforced at the database row level. No shared tenant tables."
              />
              <TrustCard
                icon={FileSignature}
                title="A signed BAA, on request"
                proof="Plain-language BAA"
                body="Business Associate Agreement available before you sign up, with a list of every subprocessor that touches PHI."
              />
              <TrustCard
                icon={ScrollText}
                title="Append-only audit trail"
                proof="Actor · timestamp · target"
                body="Every read, edit, send, and export of patient data is logged. Logs cannot be modified or deleted from the app."
              />
              <TrustCard
                icon={Link2}
                title="Magic link, no patient account"
                proof="SHA-256 hash · 24h expiry"
                body="Patients access activities through a single-use link. No email/password store. No mobile app to lose."
              />
              <TrustCard
                icon={Clock}
                title="Configurable retention"
                proof="6-year HIPAA floor"
                body="You set how long records live. Auto-purge with a downloadable JSON+PDF export sent 30 days before any deletion."
              />
              <TrustCard
                icon={Download}
                title="Your data, exportable"
                proof="JSON + PDF · within 7 days"
                body="Cancel any time and request a full archive — raw data and human-readable records. No exit fee, no negotiation."
              />
            </div>

            <div className="mt-14 rounded-2xl border border-cream/10 bg-cream/[0.03] p-6 md:p-8">
              <p className="text-sm leading-relaxed text-cream/80 md:text-base">
                Terapily operates under HIPAA Security Rule and signs
                BAAs with every clinician who handles PHI. HIPAA
                compliance is a shared responsibility — final
                accountability rests with each Covered Entity.
              </p>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 9 · COMPARED — tabela honesta */}
        {/* ============================================================ */}
        <section className="relative overflow-hidden border-t border-border/60 bg-gradient-to-b from-background via-cream-tan/30 to-background">
          {/* Decorative serif glyph */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-8 top-12 select-none font-display italic text-[16rem] leading-none text-navy/[0.04] md:-right-16 md:text-[24rem]"
          >
            ✓
          </div>

          <div className="relative mx-auto max-w-6xl px-6 pt-12 pb-12 md:pt-16 md:pb-16">
            <div className="text-center">
              <Eyebrow tone="mauve">Compared to alternatives</Eyebrow>
              <h2 className="mt-6 font-display text-4xl leading-[1.05] text-foreground md:text-5xl">
                An honest <span className="italic text-terracotta">side-by-side.</span>
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
                Public landing pages reviewed April 27, 2026. We&rsquo;ll
                update this table as competitors update theirs.
              </p>
            </div>

            {/* ─── Score banner ─── */}
            <div className="mx-auto mt-12 grid max-w-3xl grid-cols-3 gap-3 md:gap-6">
              <ScoreCard
                label="Static PDF libraries"
                score="0"
                total="7"
                tone="muted"
              />
              <ScoreCard
                label="Terapily"
                score="7"
                total="7"
                tone="hero"
              />
              <ScoreCard
                label="Homework platforms"
                score="0"
                total="7"
                tone="muted"
              />
            </div>

            {/* ─── Comparison grid (desktop) ─── */}
            <div className="relative mt-20 hidden px-4 pb-6 pt-2 md:block">
              {/* ─── Floating "Recommended" card overlaying the Terapily column ─── */}
              <div
                aria-hidden
                className="pointer-events-none absolute -top-4 bottom-2 z-10 rounded-3xl border-2 border-sage/50 bg-sage/15 shadow-[0_30px_60px_-20px_rgba(126,155,134,0.45),0_10px_30px_-10px_rgba(31,42,54,0.25)] backdrop-blur-sm transition-transform"
                style={{
                  left: "calc(4px + (100% - 8px) * 0.5652)",
                  width: "calc((100% - 8px) * 0.2174)",
                }}
              />
              {/* Recommended badge */}
              <span
                className="absolute -top-7 z-20 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-navy px-4 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-cream shadow-lg ring-1 ring-navy/20"
                style={{
                  left: "calc(4px + (100% - 8px) * 0.6739)",
                  transform: "translateX(-50%)",
                }}
              >
                <span
                  aria-hidden
                  className="text-sm leading-none"
                  style={{
                    color: "#F5C518",
                    textShadow: "0 0 8px rgba(245, 197, 24, 0.6)",
                  }}
                >
                  ★
                </span>
                Recommended
              </span>

              <div className="relative grid grid-cols-[1.6fr_1fr_1fr_1fr] overflow-hidden rounded-3xl border border-border/60 shadow-[0_30px_80px_-50px_rgba(31,42,54,0.25)]">
                {/* Header */}
                <div className="bg-card/60 px-6 py-5 text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                  Capability
                </div>
                <div className="bg-card/60 px-6 py-5 text-center text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                  Static PDF libraries
                </div>
                <div className="relative z-20 px-6 py-5 text-center">
                  <span className="font-display text-lg italic text-navy">
                    Terapily
                  </span>
                </div>
                <div className="bg-card/60 px-6 py-5 text-center text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                  Homework platforms
                </div>

                {/* Rows */}
                <CompareRow capability="Auto-scored validated scales (PHQ-9, GAD-7, PCL-5...)" terapily="35 built-in" terapilyWin alt1="No" alt1Lose alt2="Some, varies" />
                <CompareRow capability="Use the same activity in session AND between sessions" terapily="Yes" terapilyWin alt1="Manual" alt1Lose alt2="Between only" />
                <CompareRow capability="Patient access without creating an account" terapily="Magic link, 24h expiry" terapilyWin alt1="N/A" alt1Lose alt2="Account required" alt2Lose />
                <CompareRow capability="Configurable data retention with auto-purge" terapily="Yes, with export" terapilyWin alt1="No" alt1Lose alt2="Rarely published" />
                <CompareRow capability="Exportable compliance report (audit + retention + BAAs)" terapily="Practice plan" terapilyWin alt1="No" alt1Lose alt2="No" alt2Lose />
                <CompareRow capability="Public BAA + subprocessor list" terapily="Yes" terapilyWin alt1="N/A" alt1Lose alt2="On request only" />
                <CompareRow capability="Replaces your EHR" terapily="No, complements it" terapilyWin alt1="N/A" alt2="Sometimes claims to" />
              </div>
            </div>

            {/* ─── Mobile stack ─── */}
            <div className="mt-12 space-y-4 md:hidden">
              {[
                { cap: "Auto-scored validated scales (PHQ-9, GAD-7, PCL-5...)", t: "35 built-in", a1: "No", a2: "Some, varies" },
                { cap: "Same activity in session AND between sessions", t: "Yes", a1: "Manual", a2: "Between only" },
                { cap: "Patient access without an account", t: "Magic link, 24h", a1: "N/A", a2: "Account required" },
                { cap: "Configurable retention with auto-purge", t: "Yes, with export", a1: "No", a2: "Rarely published" },
                { cap: "Exportable compliance report", t: "Practice plan", a1: "No", a2: "No" },
                { cap: "Public BAA + subprocessor list", t: "Yes", a1: "N/A", a2: "On request only" },
                { cap: "Replaces your EHR", t: "No, complements it", a1: "N/A", a2: "Sometimes claims to" },
              ].map((row) => (
                <div
                  key={row.cap}
                  className="rounded-2xl border border-border/60 bg-card/60 p-5"
                >
                  <p className="text-sm font-medium text-foreground">
                    {row.cap}
                  </p>
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-sage/15 px-3 py-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-sage">
                        Terapily
                      </span>
                      <span className="text-right font-medium text-navy">
                        {row.t}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 px-3 py-1">
                      <span className="text-xs uppercase tracking-wider text-muted-foreground">
                        PDF libraries
                      </span>
                      <span className="text-right text-muted-foreground">
                        {row.a1}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 px-3 py-1">
                      <span className="text-xs uppercase tracking-wider text-muted-foreground">
                        Homework apps
                      </span>
                      <span className="text-right text-muted-foreground">
                        {row.a2}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="mx-auto mt-10 max-w-3xl text-center text-xs font-bold leading-relaxed text-muted-foreground">
              &ldquo;Static PDF libraries&rdquo; refers to subscription
              worksheet sites. &ldquo;Homework platforms&rdquo; refers to
              between-session engagement tools that require patient
              accounts. We&rsquo;re happy to update specific competitor
              names with their permission.
            </p>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 10 · PRICING */}
        {/* ============================================================ */}
        <section id="pricing" className="relative overflow-hidden border-t border-navy/20 bg-navy text-cream">
          {/* Decorative serif glyph */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 top-12 select-none font-display italic text-[18rem] leading-none text-cream/[0.04] md:-right-20 md:text-[26rem]"
          >
            $
          </div>
          {/* Soft sage glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -left-32 bottom-0 h-[28rem] w-[28rem] rounded-full bg-sage/15 blur-3xl"
          />
          {/* Soft terracotta glow under Practice */}
          <div
            aria-hidden
            className="pointer-events-none absolute right-1/4 top-1/3 h-[22rem] w-[22rem] rounded-full bg-terracotta/10 blur-3xl"
          />

          <div className="relative mx-auto max-w-5xl px-6 pt-16 pb-20 md:pt-20 md:pb-24">
            <div className="text-center">
              <Eyebrow tone="sage">Pricing · Two plans, no surprises</Eyebrow>
              <h2 className="mt-6 font-display text-4xl leading-[1.05] text-cream md:text-5xl">
                Built to last. <span className="italic text-terracotta">Priced like it.</span>
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-cream/70">
                Same security baseline on every plan. Practice adds the
                governance layer solo clinicians grow into.
              </p>
            </div>

            <div className="mt-16 grid grid-cols-1 items-center gap-8 md:grid-cols-2">
              {/* ─── Basic ─── */}
              <div className="group relative flex flex-col rounded-2xl bg-cream/90 p-8 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.4)] ring-1 ring-navy/10 transition-all duration-300 ease-out hover:z-10 hover:scale-[1.06] hover:bg-cream/95 hover:shadow-[0_30px_60px_-20px_rgba(0,0,0,0.55)] hover:ring-navy/20">
                <Eyebrow tone="sage">Basic</Eyebrow>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-display text-6xl text-navy">$69</span>
                  <span className="text-sm text-navy/65">/ month</span>
                </div>
                <p className="mt-3 text-sm text-navy/75">
                  Solo clinician getting started.
                </p>
                <ul className="mt-8 space-y-3 text-sm text-navy/85">
                  <PricingItem tone="light">Up to 20 active patients</PricingItem>
                  <PricingItem tone="light">1 clinician</PricingItem>
                  <PricingItem tone="light">35 auto-scored validated assessments</PricingItem>
                  <PricingItem tone="light">Magic link delivery — no patient login</PricingItem>
                  <PricingItem tone="light">AES-256-GCM at rest · TLS 1.3 in transit</PricingItem>
                  <PricingItem tone="light">Append-only audit log</PricingItem>
                  <PricingItem tone="light">Default retention policy (workspace-wide)</PricingItem>
                </ul>
                <div className="mt-auto pt-10">
                  <Link
                    to={primaryCtaTo}
                    className="inline-flex w-full items-center justify-center rounded-md bg-sage px-6 py-3 text-sm font-medium text-cream shadow-[0_8px_20px_-6px_rgba(126,155,134,0.5)] transition-all hover:bg-sage/90 hover:shadow-[0_12px_28px_-6px_rgba(126,155,134,0.65)]"
                  >
                    {ctaPrimaryLabel}
                  </Link>
                </div>
              </div>

              {/* ─── Practice — destacado ─── */}
              <div className="group relative flex flex-col rounded-2xl bg-cream p-10 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.5),0_0_0_1px_rgba(245,239,229,0.1)] ring-2 ring-terracotta/40 transition-all duration-300 ease-out md:scale-[1.05] hover:z-10 hover:scale-[1.11] hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6),0_0_0_1px_rgba(192,108,84,0.3)] hover:ring-terracotta/60">
                {/* Badge "Most chosen" */}
                <span
                  className="absolute -top-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-terracotta px-4 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-cream shadow-[0_8px_20px_-6px_rgba(192,108,84,0.6)]"
                >
                  <span aria-hidden style={{ color: "#F5C518", textShadow: "0 0 8px rgba(245, 197, 24, 0.6)" }}>★</span>
                  Most chosen
                </span>

                <Eyebrow tone="terracotta">Practice</Eyebrow>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-display text-6xl text-navy">$159</span>
                  <span className="text-sm text-navy/60">/ month</span>
                </div>
                <p className="mt-3 text-sm text-navy/70">
                  Established practice that needs governance.
                </p>
                <ul className="mt-8 space-y-3 text-sm text-navy/85">
                  <PricingItem tone="light">Up to 50 active patients</PricingItem>
                  <PricingItem tone="light">1 clinician (read-only supervision coming)</PricingItem>
                  <PricingItem tone="light">Everything in Basic</PricingItem>
                  <PricingItem tone="light">Encrypted session notes</PricingItem>
                  <PricingItem tone="light">Integrated scheduling</PricingItem>
                  <PricingItem tone="light">Two-factor authentication (TOTP)</PricingItem>
                  <PricingItem tone="light">Configurable retention with state &amp; minor overrides</PricingItem>
                  <PricingItem tone="light">
                    Exportable compliance report — retention policy,
                    audit trail, subprocessor BAAs, automated purge log
                  </PricingItem>
                </ul>
                <div className="mt-auto pt-10">
                  <Link
                    to={primaryCtaTo}
                    className="inline-flex w-full items-center justify-center rounded-md bg-navy px-6 py-3 text-sm font-medium text-cream shadow-[0_8px_20px_-8px_rgba(31,42,54,0.6)] transition-all hover:bg-navy/90 hover:shadow-[0_12px_28px_-8px_rgba(31,42,54,0.75)]"
                  >
                    {ctaPrimaryLabel}
                  </Link>
                </div>
              </div>
            </div>

            <p className="mx-auto mt-12 max-w-3xl text-center text-xs leading-relaxed text-cream/55">
              No card required to start · Cancel anytime · Prices in
              USD · Multi-clinician (Clinic) plan in development.
            </p>

            <p className="mx-auto mt-4 max-w-3xl text-center text-xs leading-relaxed text-cream/55">
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
  icon: Icon,
  number,
  title,
  body,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  number: string;
  title: string;
  body: string;
}) {
  return (
    <li className="group relative flex flex-col items-center text-center">
      {/* Círculo com ícone — fica sobre a linha conectora */}
      <div className="relative z-10 inline-flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-background ring-1 ring-terracotta/20 shadow-[0_12px_30px_-12px_oklch(0.28_0.027_251_/_0.35)] transition-all duration-300 group-hover:-translate-y-1 group-hover:ring-terracotta/40 group-hover:shadow-[0_18px_40px_-14px_oklch(0.28_0.027_251_/_0.5)]">
        <Icon className="h-7 w-7 text-terracotta" strokeWidth={1.5} />
      </div>

      {/* Número em serif grande */}
      <p className="mt-5 font-display text-2xl italic text-terracotta/70">{number}</p>

      <h3 className="mt-2 font-display text-xl text-navy md:text-2xl">{title}</h3>
      <p
        className="mt-3 max-w-[16rem] text-sm leading-relaxed text-muted-foreground"
        dangerouslySetInnerHTML={{ __html: body }}
      />
    </li>
  );
}

function KeyStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="group relative flex flex-col items-center rounded-2xl border border-border/60 bg-background px-4 py-6 text-center shadow-[0_14px_36px_-22px_oklch(0.28_0.027_251_/_0.3)] ring-1 ring-terracotta/5 transition-all duration-300 hover:-translate-y-1 hover:border-terracotta/30 hover:ring-terracotta/20 hover:shadow-[0_22px_50px_-24px_oklch(0.28_0.027_251_/_0.45)]">
      <p className="font-display text-4xl italic text-terracotta md:text-5xl">{value}</p>
      <p className="mt-2 text-[0.68rem] uppercase tracking-[0.18em] text-navy/70">
        {label}
      </p>
    </div>
  );
}

function StackRow({
  index,
  role,
  tool,
  highlight,
}: {
  index?: string;
  role: string;
  tool: string;
  highlight?: boolean;
}) {
  return (
    <li
      className={
        "group relative flex items-center gap-4 py-4 transition-colors " +
        (highlight ? "" : "")
      }
    >
      {/* Index */}
      {index && (
        <span
          aria-hidden
          className={
            "w-8 shrink-0 font-display text-sm italic " +
            (highlight ? "text-terracotta" : "text-muted-foreground/50")
          }
        >
          {index}
        </span>
      )}

      {/* Role */}
      <span
        className={
          "flex-1 text-sm leading-snug " +
          (highlight ? "text-foreground" : "text-muted-foreground")
        }
        dangerouslySetInnerHTML={{ __html: role }}
      />

      {/* Tool badge */}
      <span
        className={
          "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium tracking-wide " +
          (highlight
            ? "border-terracotta/30 bg-terracotta/10 text-terracotta"
            : "border-border/60 bg-background/60 text-foreground/70")
        }
      >
        <span
          aria-hidden
          className={
            "h-1.5 w-1.5 rounded-full " +
            (highlight ? "bg-terracotta" : "bg-muted-foreground/40")
          }
        />
        {tool}
      </span>
    </li>
  );
}

function TrustCard({
  icon: Icon,
  title,
  body,
  proof,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  body: string;
  proof?: string;
}) {
  return (
    <div className="group relative bg-cream p-7 transition-all duration-300 ease-out hover:z-10 hover:scale-[1.06] hover:bg-cream hover:shadow-[0_24px_48px_-16px_rgba(0,0,0,0.45),0_8px_20px_-8px_rgba(126,155,134,0.3)] hover:ring-1 hover:ring-sage/40 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-terracotta text-cream shadow-[0_8px_20px_-6px_rgba(192,108,84,0.55)] ring-1 ring-terracotta/40 transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-110">
          <Icon className="h-6 w-6" strokeWidth={2.25} />
        </span>
        {proof && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-navy/15 bg-navy/5 px-2.5 py-1 text-[0.65rem] font-medium uppercase tracking-wider text-navy/70">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-sage" />
            {proof}
          </span>
        )}
      </div>
      <h3 className="mt-5 font-display text-xl leading-tight text-navy">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-navy/70">{body}</p>
    </div>
  );
}

function CompareRow({
  capability,
  terapily,
  terapilyWin,
  alt1,
  alt1Lose,
  alt2,
  alt2Lose,
}: {
  capability: string;
  terapily: string;
  terapilyWin?: boolean;
  alt1: string;
  alt1Lose?: boolean;
  alt2: string;
  alt2Lose?: boolean;
}) {
  return (
    <>
      <div className="border-t border-border/40 bg-background px-6 py-5 text-sm leading-snug text-foreground">
        {capability}
      </div>
      <div className="border-t border-border/40 bg-background px-6 py-5 text-center text-sm">
        <CompareCell value={alt1} lose={alt1Lose} />
      </div>
      <div className="relative z-20 px-6 py-5 text-center text-sm">
        <CompareCell value={terapily} win={terapilyWin} highlight />
      </div>
      <div className="border-t border-border/40 bg-background px-6 py-5 text-center text-sm">
        <CompareCell value={alt2} lose={alt2Lose} />
      </div>
    </>
  );
}

function CompareCell({
  value,
  win,
  lose,
  highlight,
}: {
  value: string;
  win?: boolean;
  lose?: boolean;
  highlight?: boolean;
}) {
  const icon = win ? "✓" : lose ? "✕" : "·";
  const iconColor = win
    ? "bg-sage text-cream"
    : lose
      ? "bg-rust/15 text-rust ring-1 ring-rust/30"
      : "bg-terracotta/15 text-rust/70 ring-1 ring-terracotta/25";
  const valueColor = highlight
    ? "font-medium text-navy"
    : lose
      ? "text-rust/80"
      : "text-rust/70";
  return (
    <div className="flex flex-col items-center gap-2">
      <span
        aria-hidden
        className={
          "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold " +
          iconColor
        }
      >
        {icon}
      </span>
      <span className={valueColor}>{value}</span>
    </div>
  );
}

function ScoreCard({
  label,
  score,
  total,
  tone,
}: {
  label: string;
  score: string;
  total: string;
  tone: "hero" | "muted";
}) {
  const isHero = tone === "hero";
  return (
    <div
      className={
        "rounded-2xl border p-4 text-center backdrop-blur-sm md:p-6 " +
        (isHero
          ? "border-sage/40 bg-sage/15 shadow-[0_20px_50px_-30px_rgba(126,155,134,0.6)]"
          : "border-terracotta/25 bg-terracotta/[0.08]")
      }
    >
      <p
        className={
          "text-[0.6rem] font-bold uppercase tracking-[0.18em] md:text-xs " +
          (isHero ? "text-sage" : "text-rust/80")
        }
      >
        {label}
      </p>
      <p
        className={
          "mt-2 font-display leading-none " +
          (isHero
            ? "text-4xl text-navy md:text-6xl"
            : "text-3xl text-rust md:text-5xl")
        }
      >
        {score}
        <span
          className={
            "text-xl md:text-2xl " +
            (isHero ? "italic text-terracotta" : "italic text-rust/60")
          }
        >
          /{total}
        </span>
      </p>
      <p
        className={
          "mt-2 text-[0.65rem] font-bold uppercase tracking-wider " +
          (isHero ? "text-muted-foreground" : "text-rust/70")
        }
      >
        capabilities
      </p>
    </div>
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

function PricingItem({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "dark" | "light";
}) {
  const dotClass =
    tone === "dark"
      ? "bg-sage"
      : tone === "light"
        ? "bg-terracotta"
        : "bg-primary";
  return (
    <li className="flex items-start gap-3">
      <span
        className={`mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`}
        aria-hidden="true"
      />
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}

