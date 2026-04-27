import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { BRAND } from "@/lib/constants";

/**
 * Trust & Security page — EN-US.
 *
 * Página de transparência total sobre postura de segurança Terapily.
 * Padrão do mercado norte-americano de healthtech (ver Vanta, Drata, Linear /security).
 *
 * Princípio: zero promessa não verificável. Cada item desta página
 * descreve um controle implementado OU um compromisso datado.
 *
 * Status da implementação documentado em mem://features/hipaa-compliance-plan.
 */

export const Route = createFileRoute("/trust")({
  head: () => ({
    meta: [
      {
        title: "Trust & Security · Terapily",
      },
      {
        name: "description",
        content:
          "How Terapily protects your patients' PHI. Encryption, audit logging, workspace isolation, BAA, breach notification, and your right to export your data.",
      },
      {
        property: "og:title",
        content: "Trust & Security · Terapily",
      },
      {
        property: "og:description",
        content:
          "Encryption at rest, per-workspace isolation, audit logging, BAA on Practice. Read how Terapily handles PHI.",
      },
    ],
  }),
  component: TrustPage,
});

function TrustPage() {
  return (
    <div className="min-h-screen bg-background">
      <TrustHeader />
      <main>
        <TrustHero />
        <ControlsGrid />
        <Subprocessors />
        <BreachCommitment />
        <DataRights />
        <ContactBlock />
      </main>
      <TrustFooter />
    </div>
  );
}

function TrustHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/">
          <Logo size="sm" />
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link
            to="/"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to home
          </Link>
        </nav>
      </div>
    </header>
  );
}

function TrustFooter() {
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
/* Hero                                                                       */
/* -------------------------------------------------------------------------- */

function TrustHero() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-24 text-center md:py-32">
      <Eyebrow tone="mauve">Trust &amp; Security</Eyebrow>
      <h1 className="mt-6 font-display text-5xl text-foreground md:text-6xl">
        How Terapily protects <br className="hidden md:block" />
        your patients&rsquo; records.
      </h1>
      <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
        This page describes the controls we&rsquo;ve implemented and the commitments we&rsquo;ve
        made. Nothing on this page is aspirational — every claim corresponds to a control in our
        codebase or a contractual commitment to you.
      </p>
      <p className="mx-auto mt-4 max-w-xl text-xs uppercase tracking-[0.12em] text-secondary">
        Last updated · {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
      </p>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Controls grid — HIPAA Security Rule mapping                                */
/* -------------------------------------------------------------------------- */

const CONTROLS = [
  {
    eyebrow: "Encryption",
    title: "PHI encrypted at rest",
    body: "Every patient record — boards, notes, homework responses — is encrypted at rest using AES-GCM-256 before being written to the database. Encryption keys are stored separately from the encrypted data.",
    standard: "HIPAA §164.312(a)(2)(iv) · Encryption at rest",
  },
  {
    eyebrow: "Encryption",
    title: "TLS 1.3 in transit",
    body: "All connections to Terapily — web, API, magic-links — are served over TLS 1.3. We do not accept plaintext HTTP connections to any endpoint that handles PHI.",
    standard: "HIPAA §164.312(e)(1) · Transmission security",
  },
  {
    eyebrow: "Access control",
    title: "Workspace isolation at the database",
    body: "Every PHI table enforces row-level security. A clinician can only read their own workspace's records — isolation is enforced by the database itself, not by application logic. No misconfigured query can bypass it.",
    standard: "HIPAA §164.312(a)(1) · Access control",
  },
  {
    eyebrow: "Audit",
    title: "Every access logged",
    body: "Reads, edits, exports, and deletions are logged with timestamp, user ID, and action type. Logs are write-only from the application — clinicians cannot tamper with their own audit trail. Export available anytime.",
    standard: "HIPAA §164.312(b) · Audit controls",
  },
  {
    eyebrow: "Authentication",
    title: "Email verification + MFA",
    body: "Every account requires verified email at signup. Multi-factor authentication (TOTP) is available on Basic and required on Practice. Sessions expire after 15 minutes of inactivity.",
    standard: "HIPAA §164.312(d) · Person/entity authentication",
  },
  {
    eyebrow: "Integrity",
    title: "Soft delete with 30-day recovery",
    body: "Deletions are reversible for 30 days. After that, records are permanently purged. This protects against accidental deletion while meeting HIPAA retention guidance.",
    standard: "HIPAA §164.312(c)(1) · Integrity",
  },
] as const;

function ControlsGrid() {
  return (
    <section className="border-y border-border/60 bg-card/40">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow tone="sage">Technical controls</Eyebrow>
          <h2 className="mt-4 font-display text-4xl text-foreground md:text-5xl">
            Mapped to HIPAA Security Rule.
          </h2>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground">
            Each control below maps to a specific requirement of the HIPAA Security Rule. We list
            the standard so you can verify our claims.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2">
          {CONTROLS.map((c) => (
            <article
              key={c.title}
              className="rounded-lg border border-border/60 bg-background p-8"
            >
              <Eyebrow>{c.eyebrow}</Eyebrow>
              <h3 className="mt-3 font-display text-2xl text-foreground">{c.title}</h3>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
              <p className="mt-6 border-t border-border/40 pt-4 text-[0.65rem] uppercase tracking-[0.12em] text-secondary">
                {c.standard}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Subprocessors                                                              */
/* -------------------------------------------------------------------------- */

const SUBPROCESSORS = [
  {
    name: "Lovable Cloud (Supabase)",
    purpose: "Database, authentication, storage of encrypted PHI",
    location: "United States",
    baa: "Required before processing real PHI",
  },
  {
    name: "Resend",
    purpose: "Transactional email (magic-links, password reset, billing)",
    location: "United States",
    baa: "Required before processing real PHI",
    note: "Emails contain no PHI in subject or body — only opaque tokens",
  },
  {
    name: "Lemon Squeezy",
    purpose: "Subscription billing and payment processing",
    location: "United States",
    baa: "Not required — never receives PHI",
  },
  {
    name: "PostHog",
    purpose: "Product analytics (anonymous events only)",
    location: "United States",
    baa: "Not required — receives no PHI, only abstract product events",
  },
] as const;

function Subprocessors() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <Eyebrow>Subprocessors</Eyebrow>
        <h2 className="mt-4 font-display text-4xl text-foreground md:text-5xl">
          Who else touches your data.
        </h2>
        <p className="mt-6 text-base leading-relaxed text-muted-foreground">
          The complete list of services we use. Subprocessors that handle PHI sign a Business
          Associate Agreement (BAA) with us. Services that never receive PHI are listed for
          transparency.
        </p>
      </div>

      <div className="mt-12 overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <thead>
            <tr className="bg-card/60 text-left">
              <th className="p-4 font-medium text-muted-foreground">Service</th>
              <th className="p-4 font-medium text-muted-foreground">Purpose</th>
              <th className="p-4 font-medium text-muted-foreground">Region</th>
              <th className="p-4 font-medium text-muted-foreground">BAA status</th>
            </tr>
          </thead>
          <tbody>
            {SUBPROCESSORS.map((s, i) => (
              <tr
                key={s.name}
                className={i % 2 === 0 ? "bg-background" : "bg-card/30"}
              >
                <td className="p-4 align-top">
                  <p className="font-medium text-foreground">{s.name}</p>
                  {s.note && (
                    <p className="mt-1 text-xs text-muted-foreground">{s.note}</p>
                  )}
                </td>
                <td className="p-4 align-top text-muted-foreground">{s.purpose}</td>
                <td className="p-4 align-top text-muted-foreground">{s.location}</td>
                <td className="p-4 align-top text-muted-foreground">{s.baa}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-muted-foreground">
        Subprocessor list is reviewed quarterly. We notify Practice subscribers in advance of any
        change to a subprocessor that handles PHI.
      </p>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Breach notification commitment                                             */
/* -------------------------------------------------------------------------- */

function BreachCommitment() {
  return (
    <section className="border-y border-border/60 bg-card/40">
      <div className="mx-auto max-w-4xl px-6 py-24">
        <Eyebrow tone="sage">If something goes wrong</Eyebrow>
        <h2 className="mt-4 font-display text-4xl text-foreground md:text-5xl">
          Breach notification commitment.
        </h2>
        <div className="mt-10 space-y-6 text-base leading-relaxed text-muted-foreground">
          <p>
            If we discover a breach affecting your patients&rsquo; PHI, we will notify you within{" "}
            <strong className="text-foreground">72 hours of confirming the incident</strong> —
            faster than HIPAA&rsquo;s 60-day requirement. Our notice will include:
          </p>
          <ul className="ml-6 list-disc space-y-2">
            <li>What data was affected and which of your patients are involved</li>
            <li>How the breach occurred and what we&rsquo;ve done to contain it</li>
            <li>Steps you should take to notify your patients (per the Breach Notification Rule)</li>
            <li>Forensic details suitable for your supervisor or board</li>
          </ul>
          <p>
            We maintain an internal Breach Response Plan with named roles, escalation procedures,
            and forensic preservation steps. The plan is reviewed quarterly.
          </p>
          <p className="font-display italic text-foreground">
            We hope to never use it. We rehearse it anyway.
          </p>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Your data, your rights                                                     */
/* -------------------------------------------------------------------------- */

const RIGHTS = [
  {
    title: "Export anything, anytime",
    body: "Export your full patient archive, audit trail, and reports as encrypted ZIP. No support ticket. No 'export window.' One click in Settings.",
  },
  {
    title: "Cancel and walk away",
    body: "Cancel from your account. Export your data. We delete our copy within 30 days, per HIPAA retention guidance. You don't lose access to anything you built.",
  },
  {
    title: "Right of Access (your patients)",
    body: "When a patient requests a copy of their record under HIPAA's Right of Access (45 CFR §164.524), you can export their full file in under a minute. Meets the 30-day legal deadline easily.",
  },
  {
    title: "No silent training on your data",
    body: "We do not train AI models on your patients' PHI. Period. AI features that use external models (when added) will be opt-in per workspace, with the model and data flow disclosed.",
  },
] as const;

function DataRights() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <Eyebrow>Your data, your rights</Eyebrow>
        <h2 className="mt-4 font-display text-4xl text-foreground md:text-5xl">
          Yours to own. Always.
        </h2>
      </div>

      <div className="mt-16 grid gap-6 md:grid-cols-2">
        {RIGHTS.map((r) => (
          <article key={r.title} className="rounded-lg border border-border/60 bg-card/40 p-8">
            <h3 className="font-display text-2xl text-foreground">{r.title}</h3>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{r.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Contact                                                                    */
/* -------------------------------------------------------------------------- */

function ContactBlock() {
  return (
    <section className="border-t border-border/60 bg-card/40">
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <Eyebrow tone="sage">Questions our docs don&rsquo;t answer</Eyebrow>
        <h2 className="mt-4 font-display text-4xl text-foreground md:text-5xl">
          Talk to us directly.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
          Need a copy of our BAA template? Have a question your compliance officer needs answered
          before signing off? Want to verify a specific control? Email us — we respond personally,
          not from a ticket queue.
        </p>
        <div className="mt-10">
          <a
            href="mailto:security@terapily.com"
            className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-4 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            security@terapily.com →
          </a>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          For breach notification or active security incidents, mark your email{" "}
          <span className="font-mono">[URGENT]</span> in the subject line.
        </p>
      </div>
    </section>
  );
}
