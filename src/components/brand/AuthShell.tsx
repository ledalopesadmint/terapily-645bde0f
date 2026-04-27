import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { Eyebrow } from "./Eyebrow";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Casca editorial das telas de auth.
 *
 * Brand book: 60% cream, 30% navy, 10% sage. Cormorant pra título,
 * Inter pro corpo, eyebrow em tracking +120.
 */
export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: AuthShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10 sm:py-16">
        <header className="mb-12 flex items-center justify-between">
          <Link to="/" aria-label="Voltar ao início">
            <Logo size="md" />
          </Link>
        </header>

        <main className="flex-1">
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
          <footer className="mt-12 text-center text-sm text-muted-foreground">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
