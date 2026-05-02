/**
 * ResourceBox — box-style section for the library (Acervo).
 *
 * Replaces the old Netflix-style CategoryRow carousels with a cleaner
 * box pattern matching InSessionQuickAccess (Escalas validadas).
 *
 * Structure: icon left + title/subtitle + "Ver todas →" link right.
 * Optionally shows up to 3 preview cards inside the box.
 */

import { Link } from "@tanstack/react-router";
import { ArrowRight, Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ActivityIllustration } from "./illustrations";
import type { Activity } from "./library.types";

export interface PreviewItem {
  code: string;
  name: string;
  category: string;
  durationMin: number;
  shortDescription: string;
  illustration?: Activity["illustration"];
}

interface ResourceBoxProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  eyebrow?: string;
  href: string;
  count?: number;
  countLabel?: string;
  /** Up to 3 preview items to show as mini-cards inside the box. */
  previewItems?: PreviewItem[];
}

const CATEGORY_LABEL: Record<string, string> = {
  anxiety: "Ansiedade",
  depression: "Depressão",
  trauma: "Trauma",
  cbt: "TCC",
  dbt: "DBT",
  act: "ACT",
  wellbeing: "Bem-estar",
  sleep: "Sono",
  interpersonal: "Interpessoal",
};

export function ResourceBox({
  icon: Icon,
  title,
  subtitle,
  eyebrow = "Acervo",
  href,
  count,
  countLabel,
  previewItems,
}: ResourceBoxProps) {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-8">
      <div className="rounded-2xl border border-border/60 bg-card/50 p-5 sm:p-7">
        <Link
          to={href}
          className="group mb-5 flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--navy)] text-cream">
              <Icon className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-mauve">
                {eyebrow}
              </p>
              <h2 className="font-display text-xl text-foreground sm:text-2xl">
                {title}
              </h2>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground">
            Ver todas →
          </span>
        </Link>
        <p className="mb-5 text-sm text-muted-foreground max-w-xl">
          {subtitle}
        </p>

        {/* Preview cards */}
        {previewItems && previewItems.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {previewItems.map((item) => (
              <div
                key={item.code}
                className="group/card relative overflow-hidden rounded-xl border border-border/40 bg-background/60 transition-all hover:border-border hover:shadow-sm"
              >
                {/* Illustration header */}
                <div className="relative h-24 overflow-hidden bg-[var(--navy)]/5">
                  <div className="absolute inset-0 flex items-center justify-center opacity-30">
                    <ActivityIllustration
                      name={item.illustration ?? "petals"}
                      className="h-20 w-20 text-sage"
                    />
                  </div>
                  <div className="absolute bottom-2 left-3">
                    <span className="inline-block rounded-full bg-background/90 px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wider text-muted-foreground">
                      {CATEGORY_LABEL[item.category] ?? item.category}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-3 space-y-1.5">
                  <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    {item.code}
                  </p>
                  <p className="font-medium text-sm text-foreground leading-snug line-clamp-1">
                    {item.name}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {item.shortDescription}
                  </p>
                  <div className="flex items-center text-xs text-muted-foreground/70 pt-1">
                    <Clock className="mr-1 h-3 w-3" /> {item.durationMin} min
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {count != null && countLabel && previewItems && previewItems.length > 0 && count > previewItems.length && (
          <Link
            to={href}
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            + {count - previewItems.length} {countLabel}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        )}

        {count != null && countLabel && (!previewItems || previewItems.length === 0) && (
          <p className="mt-2 text-xs font-medium text-muted-foreground/70">
            {count} {countLabel}
          </p>
        )}
      </div>
    </section>
  );
}
