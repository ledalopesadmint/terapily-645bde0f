/**
 * Ilustrações abstratas do acervo Terapily.
 *
 * Princípios (brand book v3):
 * - SVG inline puro, sem dependência externa, ~1-2KB cada
 * - Geometria suave, formas orgânicas — nada figurativo
 * - Paleta restrita: Sage, Mauve (≤8% — só acento), Cream, Navy
 * - Sage e Mauve NUNCA lado a lado (regra do brand book)
 * - Editorial, não "produto consumer"
 *
 * Cada ilustração usa `currentColor` quando dá, pra herdar do contexto.
 * Cores fixas vêm dos tokens semânticos via inline `style` (oklch via var()).
 *
 * Adicionar uma nova: criar componente, registrar no `ILLUSTRATIONS` no fim.
 */

import { type Activity } from "./library.types";

interface IllustrationProps {
  className?: string;
  "aria-hidden"?: boolean;
}

const baseProps = {
  viewBox: "0 0 200 140",
  xmlns: "http://www.w3.org/2000/svg",
  preserveAspectRatio: "xMidYMid slice",
} as const;

// —— Pétalas concêntricas (PHQ-9 — sintomas que se sobrepõem)
function PetalsIllustration({ className, ...rest }: IllustrationProps) {
  return (
    <svg className={className} {...baseProps} {...rest}>
      <defs>
        <radialGradient id="petals-glow" cx="50%" cy="55%" r="60%">
          <stop offset="0%" stopColor="var(--sage)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--sage)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="200" height="140" fill="url(#petals-glow)" />
      <g transform="translate(100 70)" stroke="var(--sage)" fill="none" strokeWidth="1.2" opacity="0.85">
        <ellipse rx="42" ry="18" />
        <ellipse rx="42" ry="18" transform="rotate(45)" />
        <ellipse rx="42" ry="18" transform="rotate(90)" />
        <ellipse rx="42" ry="18" transform="rotate(135)" />
      </g>
      <circle cx="100" cy="70" r="3.5" fill="var(--navy)" />
    </svg>
  );
}

// —— Maré (GAD-7 — onda que sobe e desce)
function TideIllustration({ className, ...rest }: IllustrationProps) {
  return (
    <svg className={className} {...baseProps} {...rest}>
      <rect width="200" height="140" fill="var(--cream)" />
      <g fill="none" stroke="var(--sage)" strokeWidth="1.2" opacity="0.7">
        <path d="M0 80 Q 50 55 100 80 T 200 80" />
        <path d="M0 92 Q 50 67 100 92 T 200 92" opacity="0.6" />
        <path d="M0 104 Q 50 79 100 104 T 200 104" opacity="0.4" />
        <path d="M0 116 Q 50 91 100 116 T 200 116" opacity="0.25" />
      </g>
      <circle cx="155" cy="50" r="14" fill="none" stroke="var(--navy)" strokeWidth="1.2" />
    </svg>
  );
}

// —— Treliça (Thought Record — estrutura que organiza)
function LatticeIllustration({ className, ...rest }: IllustrationProps) {
  return (
    <svg className={className} {...baseProps} {...rest}>
      <rect width="200" height="140" fill="var(--cream)" />
      <g stroke="var(--sage)" strokeWidth="1" opacity="0.55">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <line key={`v${i}`} x1={20 + i * 18} y1="20" x2={20 + i * 18} y2="120" />
        ))}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <line key={`h${i}`} x1="20" y1={20 + i * 16.6} x2="182" y2={20 + i * 16.6} />
        ))}
      </g>
      <rect x="74" y="55" width="36" height="36" fill="var(--sage)" opacity="0.2" />
      <rect x="74" y="55" width="36" height="36" fill="none" stroke="var(--navy)" strokeWidth="1.2" />
    </svg>
  );
}

// —— Horizonte (Box breathing — quatro tempos iguais)
function HorizonIllustration({ className, ...rest }: IllustrationProps) {
  return (
    <svg className={className} {...baseProps} {...rest}>
      <rect width="200" height="140" fill="var(--cream)" />
      <rect x="55" y="35" width="90" height="70" fill="none" stroke="var(--sage)" strokeWidth="1.2" />
      <rect x="65" y="45" width="70" height="50" fill="none" stroke="var(--sage)" strokeWidth="1" opacity="0.7" />
      <rect x="75" y="55" width="50" height="30" fill="var(--sage)" opacity="0.22" />
      <line x1="0" y1="118" x2="200" y2="118" stroke="var(--navy)" strokeWidth="0.8" opacity="0.4" />
    </svg>
  );
}

// —— Espiral (4-7-8 Breathing — ciclo respiratório)
function SpiralIllustration({ className, ...rest }: IllustrationProps) {
  return (
    <svg className={className} {...baseProps} {...rest}>
      <rect width="200" height="140" fill="var(--cream)" />
      <g transform="translate(100 70)" fill="none" stroke="var(--sage)" strokeWidth="1.3">
        <path d="M0,0 m-2,0 a2,2 0 1,0 4,0 a2,2 0 1,0 -4,0" />
        <path d="M0,0 m-10,0 a10,10 0 1,0 20,0 a10,10 0 1,0 -20,0" opacity="0.85" />
        <path d="M0,0 m-22,0 a22,22 0 1,0 44,0 a22,22 0 1,0 -44,0" opacity="0.6" />
        <path d="M0,0 m-38,0 a38,38 0 1,0 76,0 a38,38 0 1,0 -76,0" opacity="0.35" />
        <path d="M0,0 m-58,0 a58,58 0 1,0 116,0 a58,58 0 1,0 -116,0" opacity="0.18" />
      </g>
    </svg>
  );
}

// —— Espalhado (Cognitive Distortions — pensamentos a categorizar)
function ScatteredIllustration({ className, ...rest }: IllustrationProps) {
  return (
    <svg className={className} {...baseProps} {...rest}>
      <rect width="200" height="140" fill="var(--cream)" />
      {/* Mauve vem aqui como ACENTO — único uso na ilustração, OK pela regra ≤8% */}
      <g>
        <rect x="20" y="30" width="28" height="14" rx="3" fill="var(--mauve)" opacity="0.5" />
        <rect x="58" y="48" width="34" height="14" rx="3" fill="var(--sage)" opacity="0.55" />
        <rect x="105" y="28" width="30" height="14" rx="3" fill="var(--sage)" opacity="0.55" />
        <rect x="148" y="52" width="32" height="14" rx="3" fill="var(--mauve)" opacity="0.45" />
        <rect x="32" y="78" width="36" height="14" rx="3" fill="var(--sage)" opacity="0.45" />
        <rect x="82" y="86" width="30" height="14" rx="3" fill="var(--sage)" opacity="0.55" />
        <rect x="128" y="92" width="38" height="14" rx="3" fill="var(--mauve)" opacity="0.5" />
      </g>
    </svg>
  );
}

// —— Âncora (Grounding 5-4-3-2-1)
function AnchorIllustration({ className, ...rest }: IllustrationProps) {
  return (
    <svg className={className} {...baseProps} {...rest}>
      <rect width="200" height="140" fill="var(--cream)" />
      <g transform="translate(100 70)" stroke="var(--sage)" fill="none" strokeWidth="1.3">
        <line x1="0" y1="-32" x2="0" y2="34" />
        <line x1="-22" y1="-22" x2="22" y2="-22" />
        <path d="M -28 8 Q -28 38 0 38 Q 28 38 28 8" />
        <line x1="-28" y1="8" x2="-36" y2="14" />
        <line x1="28" y1="8" x2="36" y2="14" />
        <circle cx="0" cy="-32" r="5" fill="var(--cream)" />
      </g>
      <line x1="0" y1="115" x2="200" y2="115" stroke="var(--navy)" strokeWidth="0.8" opacity="0.35" />
    </svg>
  );
}

// —— Bússola (Evidence For/Against — direção)
function CompassIllustration({ className, ...rest }: IllustrationProps) {
  return (
    <svg className={className} {...baseProps} {...rest}>
      <rect width="200" height="140" fill="var(--cream)" />
      <g transform="translate(100 70)" fill="none" stroke="var(--sage)" strokeWidth="1.2">
        <circle r="44" />
        <circle r="32" opacity="0.55" />
        <line x1="-50" y1="0" x2="50" y2="0" opacity="0.4" />
        <line x1="0" y1="-50" x2="0" y2="50" opacity="0.4" />
        <polygon points="0,-32 6,0 0,32 -6,0" fill="var(--navy)" stroke="none" />
        <circle r="3" fill="var(--cream)" />
      </g>
    </svg>
  );
}

const REGISTRY: Record<Activity["illustration"], React.FC<IllustrationProps>> = {
  petals: PetalsIllustration,
  tide: TideIllustration,
  lattice: LatticeIllustration,
  horizon: HorizonIllustration,
  spiral: SpiralIllustration,
  scattered: ScatteredIllustration,
  anchor: AnchorIllustration,
  compass: CompassIllustration,
};

export function ActivityIllustration({
  id,
  className,
}: {
  id: Activity["illustration"];
  className?: string;
}) {
  const Component = REGISTRY[id];
  return <Component className={className} aria-hidden />;
}
