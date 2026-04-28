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
 * Casca editorial das telas de auth — split layout.
 *
 * Esquerda: painel navy sólido com ícone T + frase âncora capitular
 * ("O homework que seu paciente faz."). Brand recall ancorado em jargão
 * clínico — toda vez que o terapeuta passar homework, lembra de nós.
 *
 * Direita: cream com formulário. Brand book 60/30/10 mantido.
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
      {/* Painel esquerdo — frase âncora (desktop only) */}
      <aside className="relative hidden overflow-hidden bg-secondary text-secondary-foreground lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-12">
        {/* Ícone T no canto superior esquerdo */}
        <Link
          to="/"
          aria-label="Voltar ao início"
          className="inline-flex w-fit items-center transition-opacity hover:opacity-80"
        >
          <img
            src={iconSrc}
            alt=""
            aria-hidden="true"
            className="h-11 w-11 select-none object-contain"
            draggable={false}
          />
        </Link>

        {/* Frase âncora capitular */}
        <div className="max-w-md">
          <p
            className="font-display text-secondary-foreground"
            style={{ lineHeight: 1.05 }}
          >
            <span
              className="float-left mr-3 font-display text-[7rem] leading-[0.85] text-accent"
              style={{ marginTop: "0.05em" }}
            >
              O
            </span>
            <span className="text-5xl font-light tracking-tight">
              homework
              <br />
              que seu paciente
              <br />
              faz.
            </span>
          </p>

          <div className="mt-10 flex items-center gap-4">
            <span className="h-px w-10 bg-accent/60" aria-hidden="true" />
            <span
              className="text-xs uppercase text-secondary-foreground/70"
              style={{ letterSpacing: "0.12em" }}
            >
              bem-vinda de volta
            </span>
          </div>
        </div>

        {/* Pé do painel — wordmark sutil */}
        <div className="text-xs text-secondary-foreground/50">
          terapily<span className="text-accent">.</span> · therapeutic tools
          your clients actually finish
        </div>
      </aside>

      {/* Coluna direita — formulário */}
      <div className="flex min-h-screen flex-col px-6 py-10 sm:py-16 lg:px-16">
        {/* Header mobile com logo (no desktop o ícone vive no painel esquerdo) */}
        <header className="mb-12 flex items-center justify-between lg:hidden">
          <Link to="/" aria-label="Voltar ao início">
            <Logo size="md" />
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
