/**
 * ResourceBox — box-style section for the library (Acervo).
 *
 * Matches InSessionQuickAccess visual pattern: header row with icon/title/link,
 * subtitle, and up to 3 ScaleCard-style preview cards inside.
 */

import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ScaleCard, getScaleIllustration } from "./ScaleCard";
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
  /** Label shown in the chip area instead of "Escala validada". */
  chipLabel?: string;
  /** Up to 3 preview items to show as ScaleCard-style cards inside the box. */
  previewItems?: PreviewItem[];
}

export function ResourceBox({
  icon: Icon,
  title,
  subtitle,
  eyebrow = "Acervo",
  href,
  count,
  countLabel,
  chipLabel,
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

        {/* Preview cards — reuses ScaleCard for visual consistency */}
        {previewItems && previewItems.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {previewItems.map((item) => (
              <ScaleCard
                key={item.code}
                code={item.code}
                name={item.name}
                category={item.category}
                durationMin={item.durationMin}
                shortDescription={item.shortDescription}
                illustration={item.illustration ?? getScaleIllustration(item.category)}
              />
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
