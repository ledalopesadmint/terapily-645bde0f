import type { ReactNode } from "react";
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
        {/* 1 · HERO — invertido Navy + Trust strip translúcido */}
        {/* ============================================================ */}
        <section className="relative overflow-hidden bg-navy text-cream">
          {/* glow Sage sutil canto sup. direito */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-sage/15 blur-3xl"
          />
          {/* glow Mauve baixo esquerda — decorativo, ≤8% */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-40 -left-40 h-[24rem] w-[24rem] rounded-full bg-mauve/10 blur-3xl"
          />

          <div className="relative mx-auto max-w-4xl px-6 py-24 text-center md:py-32">
            <Eyebrow tone="mauve">Every activity grounded in published evidence</Eyebrow>

            <h1 className="mt-6 font-display text-5xl text-cream md:text-7xl">
              Therapeutic tools <br className="hidden md:block" />
              your clients actually finish.
            </h1>

            <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-cream/75 md:text-lg">
              Run validated scales and CBT activities live in session,
              send them home with a single secure link, or both. Every
              activity becomes a record you can actually use — without
              replacing your existing EHR.
            </p>

            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                to={primaryCtaTo}
                className="inline-flex items-center justify-center rounded-2xl bg-cream px-6 py-3 text-sm font-medium text-navy shadow-lg shadow-navy/20 transition-all hover:scale-[1.02] hover:bg-cream/95"
              >
                {ctaPrimaryLabel}
              </Link>
              {!isAuthenticated && (
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-2xl border border-cream/25 bg-cream/5 px-6 py-3 text-sm font-medium text-cream backdrop-blur-sm transition-colors hover:bg-cream/10"
                >
                  I already have an account
                </Link>
              )}
            </div>

            <p className="mt-6 text-xs text-cream/55">
              No card required · Cancel anytime · Operates under HIPAA Security Rule
            </p>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 1.5 · TRUST STRIP — seção isolada (fácil de retematizar) */}
        {/* ============================================================ */}
        <section className="bg-navy">
          <div className="mx-auto max-w-6xl px-6 pb-20 md:pb-24">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <TrustFactInverted label="Validated scales" value="35" />
              <TrustFactInverted label="Score to report" value="<3s" />
              <TrustFactInverted label="Encryption at rest" value="AES-256" />
              <TrustFactInverted label="Patient logins required" value="0" />
              <TrustFactInverted label="Audit log coverage" value="100%" />
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 2.5 · EMOTIONAL HOOK — bloco editorial, voz calma + dor real */}
        {/* ============================================================ */}
        <section className="mx-auto max-w-3xl px-6 py-28 text-center md:py-36">
          <p className="font-display text-3xl leading-[1.15] text-foreground md:text-5xl">
            You explain. <br />
            They nod. <br />
            They leave.
          </p>
          <p className="mx-auto mt-10 max-w-xl font-display text-2xl leading-[1.25] text-muted-foreground md:text-3xl">
            Next session, nothing changed.
          </p>
          <p className="mx-auto mt-10 max-w-lg text-base leading-relaxed text-muted-foreground">
            Not because they don&rsquo;t care. Because the system
            you were handed — printable PDFs, manual scoring, no
            visibility between sessions — was never built to help
            them follow through.
          </p>
          <p className="mx-auto mt-10 max-w-xl font-display text-2xl text-foreground md:text-3xl">
            Terapily is the system that was missing.
          </p>
          <div className="mx-auto mt-12 grid max-w-2xl grid-cols-1 gap-6 text-left sm:grid-cols-3">
            <BenefitPill title="Less manual work" body="Auto-scoring, magic-link delivery, one-click reports." />
            <BenefitPill title="More follow-through" body="Activities clients open on any device — no account, no app." />
            <BenefitPill title="Records that hold up" body="Every read, edit, and export logged. Exportable on demand." />
          </div>
        </section>

        {/* ============================================================ */}
        {/* 3 · PROBLEM — dores reais da persona */}
        {/* ============================================================ */}
        <section className="mx-auto max-w-5xl px-6 py-24">
          <div className="text-center">
            <Eyebrow>The reality between sessions</Eyebrow>
            <h2 className="mt-6 font-display text-4xl text-foreground md:text-5xl">
              Most homework never comes back. <br className="hidden md:block" />
              Most paperwork never gets scored.
            </h2>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-10 md:grid-cols-3">
            <ProblemCard
              eyebrow="The compliance gap"
              title="You can&rsquo;t prove what you can&rsquo;t produce."
              body="When an auditor, supervisor, or insurer asks what you did and when, you need a record — not a folder of PDFs and a memory of last Tuesday."
            />
            <ProblemCard
              eyebrow="The engagement gap"
              title="Clients don&rsquo;t finish printable PDFs."
              body="Static worksheets feel like school. They get folded, lost, or filled out in the waiting room two minutes before your session."
            />
            <ProblemCard
              eyebrow="The signal gap"
              title="Manual scoring eats your evenings."
              body="PHQ-9, GAD-7, PCL-5 — same scoring, every patient, every week. The math should not be your problem."
            />
          </div>
        </section>

        {/* ============================================================ */}
        {/* 4 · 3 MODOS DE USO — diferencial único no mercado */}
        {/* ============================================================ */}
        <section className="border-t border-border/60 bg-card/40">
          <div className="mx-auto max-w-5xl px-6 py-24">
            <div className="text-center">
              <Eyebrow tone="sage">Three ways to use any activity</Eyebrow>
              <h2 className="mt-6 font-display text-4xl text-foreground md:text-5xl">
                Your session. Your call.
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
                Every activity in Terapily — a validated scale, a CBT
                exercise, a thought record — works in three modes.
                You decide which one fits the moment.
              </p>
            </div>

            <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
              <ModeCard
                tag="Mode 01"
                title="In session"
                body="Run the activity live on your screen, on a tablet, or read the items aloud. Scoring and report appear before the client leaves the room."
                useCase="Use when you want to anchor a clinical decision in the same hour."
              />
              <ModeCard
                tag="Mode 02"
                title="Sent home"
                body="Generate a secure single-use link. Your client opens it on any device — no account, no app to download, no password to forget. Default link expiry: 24 hours."
                useCase="Use for between-session homework, weekly tracking, intake forms."
              />
              <ModeCard
                tag="Mode 03"
                title="Both"
                body="Apply it together in session, then send the same activity home for repeat measurement. Results stack into a single timeline on the patient&rsquo;s record."
                useCase="Use to measure change between two points without re-explaining the tool."
              />
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 5 · HOW IT WORKS — 4 steps */}
        {/* ============================================================ */}
        <section id="how-it-works" className="mx-auto max-w-5xl px-6 py-24">
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
          <div className="mx-auto max-w-4xl px-6 py-24 text-center">
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
        <section className="mx-auto max-w-5xl px-6 py-24">
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
          <div className="mx-auto max-w-5xl px-6 py-24">
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
        <section className="mx-auto max-w-5xl px-6 py-24">
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
        <section id="faq" className="mx-auto max-w-3xl px-6 py-24">
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
          <div className="mx-auto max-w-3xl px-6 py-24 text-center">
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
    <div className="rounded-2xl border border-border/50 bg-card/60 p-5 backdrop-blur-sm transition-colors hover:bg-card/80">
      <p className="font-display text-base text-foreground">{title}</p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{body}</p>
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
 * Variante do TrustFact pra fundo Navy do hero.
 * Card squircle translúcido cream — leveza visual, refere ao app.
 */
function TrustFactInverted({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-cream/15 bg-cream/[0.06] px-4 py-5 backdrop-blur-sm transition-colors hover:bg-cream/[0.10]">
      <p className="font-display text-2xl text-cream md:text-3xl">{value}</p>
      <p className="mt-1 text-[0.65rem] uppercase tracking-wider text-cream/60">
        {label}
      </p>
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

function ModeCard({
  tag,
  title,
  body,
  useCase,
}: {
  tag: string;
  title: string;
  body: string;
  useCase: string;
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border/60 bg-card/60 p-7 backdrop-blur-sm">
      <Eyebrow tone="sage">{tag}</Eyebrow>
      <h3 className="mt-3 font-display text-2xl text-foreground">{title}</h3>
      <p
        className="mt-4 text-sm leading-relaxed text-muted-foreground"
        dangerouslySetInnerHTML={{ __html: body }}
      />
      <p className="mt-6 border-t border-border/40 pt-4 text-xs italic leading-relaxed text-muted-foreground">
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
