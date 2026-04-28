import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { Eyebrow } from "./Eyebrow";
import iconSrc from "@/assets/terapily-icon.png";

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

        {/* Giant ghost "H" — brand watermark, off-axis (top-right, tilted) */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute select-none font-display font-light leading-none text-[var(--cream)]"
          style={{
            fontSize: "clamp(32rem, 52vw, 56rem)",
            opacity: 0.025,
            top: "-8%",
            right: "-12%",
            transform: "rotate(-12deg)",
            letterSpacing: "-0.06em",
          }}
        >
          H
        </span>

        {/* Sage accent dot — bottom-left, balances the H weight */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute h-2 w-2 rounded-full bg-[var(--sage)]"
          style={{ bottom: "22%", left: "3.5rem", opacity: 0.7 }}
        />

        {/* Eyebrow tag */}
        <div className="relative mb-12 flex items-center gap-4">
          <span
            className="h-px w-10 bg-[var(--sage)]"
            aria-hidden="true"
          />
          <span
            className="text-[10px] uppercase text-[var(--cream)]/60"
            style={{ letterSpacing: "0.24em" }}
          >
            welcome back
          </span>
        </div>

        {/* Anchor phrase — layered typography, asymmetric rhythm */}
        <h2
          className="relative max-w-[18ch] font-display font-light text-[var(--cream)]"
          style={{ lineHeight: 0.95, letterSpacing: "-0.025em" }}
        >
          <span
            className="block"
            style={{ fontSize: "clamp(4rem, 6vw, 6.5rem)" }}
          >
            Homework
          </span>
          <span
            className="mt-3 block pl-[3.5rem] italic text-[var(--cream)]/65"
            style={{ fontSize: "clamp(2rem, 3vw, 3rem)" }}
          >
            your clients
          </span>
          <span
            className="mt-3 block"
            style={{ fontSize: "clamp(2.75rem, 4.2vw, 4.5rem)" }}
          >
            <span className="text-[var(--cream)]/45">actually </span>
            <span className="relative inline-block italic" style={{ color: "var(--sage)" }}>
              do
              <svg
                aria-hidden="true"
                viewBox="0 0 80 14"
                preserveAspectRatio="none"
                className="absolute -bottom-2 left-0 h-[14px] w-full"
              >
                <path
                  d="M2 9 C 16 2, 32 13, 48 5 S 70 11, 78 6"
                  fill="none"
                  stroke="var(--sage)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  opacity="0.85"
                />
              </svg>
            </span>
            <span className="text-[var(--cream)]/45">.</span>
          </span>
        </h2>

        {/* Subtle attribution under the phrase */}
        <p className="relative mt-10 max-w-[28ch] text-sm text-[var(--cream)]/45" style={{ lineHeight: 1.6 }}>
          The work between sessions is where therapy{" "}
          <span className="italic text-[var(--cream)]/70">actually</span> happens.
        </p>

        {/* Footnote — bottom anchor */}
        <div className="absolute bottom-10 left-16 right-16 flex items-center justify-between text-[10px] uppercase text-[var(--cream)]/35" style={{ letterSpacing: "0.18em" }}>
          <span>therapeutic tools</span>
          <span>terapily<span className="text-[var(--sage)]">.</span></span>
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
        </main>

        {footer && (
          <footer className="mx-auto mt-12 w-full max-w-md text-center text-sm text-muted-foreground lg:mx-0 lg:text-left">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
