/**
 * ResourceBox — box-style section for the library (Acervo).
 *
 * Replaces the old Netflix-style CategoryRow carousels with a cleaner
 * box pattern matching InSessionQuickAccess (Escalas validadas).
 *
 * Structure: icon left + title/subtitle + "Ver todas →" link right.
 * Compact, professional, no inline content preview.
 */

import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

interface ResourceBoxProps {
  /** Lucide icon displayed in the navy square. */
  icon: LucideIcon;
  /** Main heading (Cormorant display). */
  title: string;
  /** Short description below the title. */
  subtitle: string;
  /** Eyebrow label above the title. */
  eyebrow?: string;
  /** Route to navigate when clicking "Ver todas". */
  href: string;
  /** Item count to display (e.g. "16 worksheets"). */
  count?: number;
  /** Count label (plural noun). */
  countLabel?: string;
}

export function ResourceBox({
  icon: Icon,
  title,
  subtitle,
  eyebrow = "Acervo",
  href,
  count,
  countLabel,
}: ResourceBoxProps) {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-8">
      <Link
        to={href}
        className="group block rounded-2xl border border-border/60 bg-card/50 p-5 transition-all hover:border-border hover:shadow-sm sm:p-7"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--navy)] text-cream">
              <Icon className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-mauve">
                {eyebrow}
              </p>
              <h2 className="font-display text-xl text-foreground sm:text-2xl">
                {title}
              </h2>
            </div>
          </div>
          <span className="hidden shrink-0 items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground sm:inline-flex">
            Ver todas →
          </span>
        </div>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          {subtitle}
        </p>
        {count != null && countLabel && (
          <p className="mt-2 text-xs font-medium text-muted-foreground/70">
            {count} {countLabel}
          </p>
        )}
      </Link>
    </section>
  );
}
