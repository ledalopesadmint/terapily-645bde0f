/**
 * Tipos compartilhados do Acervo (Library).
 *
 * Extraídos do antigo catalog.ts mockado (S1).
 * A fonte de verdade para dados é a tabela `activity_catalog` no banco.
 * Esses tipos descrevem o shape que os componentes de UI esperam.
 */

import type { ArchetypeId } from "./archetypes";

export type DeliveryMode = "in_session" | "shared_link" | "both";

/**
 * Tema visual da atividade. 6 paletas brand-coerentes definidas em styles.css.
 * Mesmos valores do enum `activity_theme` no banco.
 *   - sage      → calmo, respiração, mindfulness
 *   - mauve     → autocompaixão, vínculo
 *   - navy      → avaliações clínicas (escalas validadas)
 *   - cream     → psicoeducação, leitura
 *   - terracotta → somático, corpo
 *   - sage-dark → sono, noite, regulação
 */
export type ActivityTheme =
  | "sage"
  | "mauve"
  | "navy"
  | "cream"
  | "terracotta"
  | "sage-dark";

export type CategoryId =
  | "anxiety"
  | "depression"
  | "cbt"
  | "mindfulness"
  | "trauma"
  | "dbt"
  | "act"
  | "sleep"
  | "crisis";

export interface Category {
  id: CategoryId;
  label: string;
  subtitle: string;
}

export interface Activity {
  id: string;
  code: string;
  name: string;
  approach: string;
  category: CategoryId;
  archetype: ArchetypeId;
  theme: ActivityTheme;
  durationMin: number;
  shortDescription: string;
  illustration:
    | "petals"
    | "tide"
    | "lattice"
    | "horizon"
    | "spiral"
    | "scattered"
    | "anchor"
    | "compass";
  supportedModes: DeliveryMode[];
  sensitive?: boolean;
}
