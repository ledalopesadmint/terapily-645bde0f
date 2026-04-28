import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { Eyebrow } from "./Eyebrow";
import iconSrc from "@/assets/terapily-icon.png";
import iconCreamSrc from "@/assets/terapily-icon-cream.png";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Auth shell — split layout.
 *
 * Left: navy panel with anchor phrase ("Homework your clients actually do.")
 * — drop cap on "H", handwritten underline on "do" to mimic a clinical
 * margin note. Brand recall play (Ladeira-style): every time the therapist
 * assigns homework, they hear our line.
 *
 * Right: cream form. Top-left wordmark `[T] terapily.` lives above the form,
 * outside the navy panel.
 */
export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: AuthShellProps) {
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[5fr_6fr]">
      {/* Left panel — navy with anchor phrase (desktop only) */}
      <aside className="relative hidden overflow-hidden bg-[var(--navy)] text-[var(--cream)] lg:flex lg:flex-col lg:justify-center lg:px-16 lg:py-16">
        {/* Ambient glow — subtle sage radial, top-right */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full opacity-[0.08]"
          style={{
            background:
              "radial-gradient(circle, var(--sage) 0%, transparent 70%)",
          }}
        />

        {/* Giant ghost "H" — brand mark behind the phrase */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute select-none font-display font-light leading-none text-[var(--cream)]"
          style={{
            fontSize: "clamp(28rem, 42vw, 44rem)",
            opacity: 0.05,
            top: "50%",
            left: "50%",
            transform: "translate(-58%, -52%)",
            letterSpacing: "-0.05em",
          }}
        >
          H
        </span>

        {/* Eyebrow tag */}
        <div className="relative mb-10 flex items-center gap-4">
          <span
            className="h-px w-8 bg-[var(--sage)]"
            aria-hidden="true"
          />
          <span
            className="text-[10px] uppercase text-[var(--cream)]/55"
            style={{ letterSpacing: "0.22em" }}
          >
            welcome back
          </span>
        </div>

        {/* Anchor phrase — single line, balanced */}
        <div className="relative max-w-xl">
          <h2
            className="font-display font-light text-[var(--cream)]"
            style={{
              fontSize: "clamp(2.75rem, 4.4vw, 4.25rem)",
              lineHeight: 1.05,
              letterSpacing: "-0.015em",
            }}
          >
            <span className="text-[var(--cream)]">Homework</span>{" "}
            <span className="text-[var(--cream)]/70 italic">your clients</span>{" "}
            <span className="text-[var(--cream)]/85">actually </span>
            <span className="relative inline-block italic text-[var(--cream)]">
              do
              <svg
                aria-hidden="true"
                viewBox="0 0 80 14"
                preserveAspectRatio="none"
                className="absolute -bottom-1 left-0 h-[10px] w-full"
              >
                <path
                  d="M2 8 C 16 2, 32 12, 48 5 S 70 10, 78 6"
                  fill="none"
                  stroke="var(--sage)"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  opacity="0.9"
                />
              </svg>
            </span>
            <span className="text-[var(--cream)]/85">.</span>
          </h2>

          <p
            className="mt-8 max-w-md text-[var(--cream)]/55"
            style={{ fontSize: "0.95rem", lineHeight: 1.6 }}
          >
            The work between sessions is where therapy{" "}
            <em className="text-[var(--cream)]/80 not-italic font-medium">really</em>{" "}
            happens.
          </p>
        </div>

        {/* Footnote — bottom anchor */}
        <div className="absolute bottom-10 left-16 right-16 flex items-center justify-between text-[10px] uppercase text-[var(--cream)]/35" style={{ letterSpacing: "0.18em" }}>
          <span>therapeutic tools</span>
          <span className="flex items-center gap-2">
            <img
              src={iconCreamSrc}
              alt=""
              aria-hidden="true"
              className="h-4 w-4 object-contain opacity-35"
            />
            <span>terapily<span className="text-[var(--sage)]">.</span></span>
          </span>
        </div>
      </aside>

      {/* Right column — form */}
      <div className="flex min-h-screen flex-col px-6 py-8 sm:py-10 lg:px-16 lg:py-10">
        {/* Header — [T] terapily. wordmark above the form, top-left */}
        <header className="mb-12 flex items-center justify-between">
          <Link
            to="/"
            aria-label="Back to home"
            className="transition-opacity hover:opacity-80"
          >
            <Logo size="md" withIcon />
          </Link>
        </header>

        <main className="mx-auto w-full max-w-md flex-1 lg:mx-0">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-4 font-display text-4xl leading-tight text-foreground sm:text-5xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-3 text-base text-muted-foreground">{subtitle}</p>
          )}

          <div className="mt-10">{children}</div>

          {/* Patient disambiguation — pacientes não fazem login */}
          <p className="mt-10 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--sage)]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="8" cy="8" r="6.5" />
              <path d="M8 5.5v3M8 11h.01" strokeLinecap="round" />
            </svg>
            <span>
              This sign-in is for clinicians only. Your clients open
              activities through a secure link — no account required.
            </span>
          </p>
        </main>

        {footer && (
          <div className="mx-auto mt-10 w-full max-w-md text-center text-sm text-muted-foreground lg:mx-0 lg:text-left">
            {footer}
          </div>
        )}

        {/* Trust footer — same security claims as the landing */}
        <footer className="mx-auto mt-10 w-full max-w-md lg:mx-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] uppercase text-muted-foreground/70" style={{ letterSpacing: "0.14em" }}>
            <span className="flex items-center gap-1.5">
              <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M8 1.5l5.5 2v4.2c0 3.4-2.3 6.4-5.5 7.3-3.2-.9-5.5-3.9-5.5-7.3V3.5L8 1.5z" strokeLinejoin="round" />
              </svg>
              TLS 1.3
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span>AES-256</span>
            <span className="text-muted-foreground/40">·</span>
            <span>Operates under HIPAA Security Rule</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
