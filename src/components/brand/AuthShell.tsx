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
      <aside className="relative hidden overflow-hidden bg-[var(--navy)] text-[var(--cream)] lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-14">
        {/* spacer top — keeps phrase optically centered */}
        <div aria-hidden="true" />

        {/* Anchor phrase with drop cap + handwritten underline */}
        <div className="max-w-md">
          <p className="font-display" style={{ lineHeight: 1.05 }}>
            <span
              className="float-left mr-3 font-display text-[7.5rem] font-light leading-[0.82] text-[var(--cream)]"
              style={{ marginTop: "0.04em" }}
              aria-hidden="true"
            >
              H
            </span>
            <span className="text-5xl font-light tracking-tight text-[var(--cream)]">
              <span className="sr-only">H</span>omework
              <br />
              your clients
              <br />
              actually{" "}
              <span className="relative inline-block italic">
                do
                {/* handwritten-style underline */}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 60 14"
                  preserveAspectRatio="none"
                  className="absolute -bottom-1.5 left-0 h-[10px] w-full"
                >
                  <path
                    d="M2 8 C 12 3, 28 11, 42 5 S 56 9, 58 6"
                    fill="none"
                    stroke="var(--sage)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              .
            </span>
          </p>

          <div className="mt-12 flex items-center gap-4">
            <span
              className="h-px w-10 bg-[var(--cream)]/40"
              aria-hidden="true"
            />
            <span
              className="text-xs uppercase text-[var(--cream)]/60"
              style={{ letterSpacing: "0.14em" }}
            >
              welcome back
            </span>
          </div>
        </div>

        {/* footnote */}
        <div className="text-xs text-[var(--cream)]/40">
          terapily<span className="text-[var(--sage)]">.</span> · therapeutic
          tools your clients actually finish
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
