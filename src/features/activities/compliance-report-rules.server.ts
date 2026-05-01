/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  REGRAS INDISPENSÁVEIS E OBRIGATÓRIAS — Compliance Report (v10)        ║
 * ║  Source of truth: mem://design/compliance-report-template               ║
 * ║                                                                         ║
 * ║  TODO relatório desta categoria DEVE passar por este crivo.             ║
 * ║  Nenhum PDF pode ser retornado ao cliente se violar qualquer regra.     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Este módulo exporta:
 *   1. COMPLIANCE_RULES — constantes e limites obrigatórios
 *   2. PROHIBITED_WORDS — palavras proibidas no relatório
 *   3. validateReportData() — validação pré-geração (dados de entrada)
 *   4. validateGeneratedPDF() — validação pós-geração (integridade do PDF)
 */

// ── 1. REGRAS DE LAYOUT (mm, A4 210×297) ──────────────────────────────────

export const COMPLIANCE_RULES = {
  /** Página A4 em mm */
  PAGE_WIDTH: 210,
  PAGE_HEIGHT: 297,

  /** Margens laterais */
  MARGIN: 18,

  /** Largura útil do conteúdo */
  get CONTENT_WIDTH() {
    return this.PAGE_WIDTH - this.MARGIN * 2;
  },

  /** Header Navy — altura fixa */
  HEADER_HEIGHT: 18,

  /** Footer — posição Y fixa (a partir de PAGE_HEIGHT) */
  FOOTER_Y_OFFSET: 14,

  /** Zona segura de conteúdo (abaixo do header, acima do footer) */
  get CONTENT_TOP() {
    return this.HEADER_HEIGHT + 4;
  },
  get CONTENT_BOTTOM() {
    return this.PAGE_HEIGHT - this.FOOTER_Y_OFFSET - 4;
  },

  /** Gap obrigatório entre blocos de conteúdo (mm) */
  CONTENT_GAP: 9,

  /** Padding mínimo antes de qualquer título de seção (mm) */
  SECTION_TITLE_PADDING: 9,

  /** Espaço mínimo restante na página antes de iniciar novo bloco (mm) */
  MIN_REMAINING_FOR_NEW_BLOCK: 45,

  /** Tamanhos de fonte obrigatórios */
  FONT_SIZES: {
    REPORT_TITLE: 18,
    SECTION_TITLE: 12,
    SUBSECTION_TITLE: 10,
    BODY: 8.5,
    SMALL: 7.5,
    MICRO: 6.5,
    LEGAL: 5.5,
  },

  /** Cores obrigatórias (RGB) */
  COLORS: {
    NAVY: [31, 42, 54] as const,
    CREAM: [244, 239, 230] as const,
    SAGE: [126, 155, 134] as const,
    CHARCOAL: [58, 63, 71] as const,
    WHITE: [255, 255, 255] as const,
    RED: [192, 57, 43] as const,
  },

  /** Watermark — opacidade máxima permitida */
  WATERMARK_MAX_OPACITY: 0.05,

  /** Limite máximo de eventos no audit trail */
  AUDIT_TRAIL_MAX_EVENTS: 50,

  /** Nota obrigatória quando audit trail é truncado */
  AUDIT_TRAIL_TRUNCATION_NOTE:
    "Showing most recent 50 events. Full audit trail available upon request.",
} as const;

// ── 2. PALAVRAS PROIBIDAS ──────────────────────────────────────────────────

/**
 * Palavras e expressões que NUNCA devem aparecer no relatório.
 * Qualquer ocorrência é uma violação grave.
 *
 * Categorias:
 *   - Interpretativas: sugerem julgamento clínico pelo software
 *   - Falsas garantias: prometem algo que a plataforma não certifica
 *   - Preditivas: sugerem análise de tendência ou prognóstico
 */
export const PROHIBITED_WORDS = {
  interpretive: [
    "improving",
    "worsening",
    "better",
    "worse",
    "progress",
    "regression",
    "deteriorating",
    "recovering",
    "stable condition",
    "getting better",
    "getting worse",
  ],
  false_guarantees: [
    "hipaa-certified",
    "hipaa certified",
    "court-defensible",
    "court defensible",
    "legally binding",
    "legally-binding",
    "guaranteed",
    "unbreakable",
    "military-grade",
    "military grade",
    "perfect",
    "100% secure",
    "certified",
  ],
  predictive: [
    "trend analysis",
    "prediction",
    "prognosis",
    "forecast",
    "rci",
    "csi",
    "clinically significant change",
    "reliable change index",
  ],
} as const;

const ALL_PROHIBITED = [
  ...PROHIBITED_WORDS.interpretive,
  ...PROHIBITED_WORDS.false_guarantees,
  ...PROHIBITED_WORDS.predictive,
];

// ── 3. REGRAS DE CONTEÚDO OBRIGATÓRIO ──────────────────────────────────────

/**
 * Elementos que DEVEM estar presentes no relatório clínico.
 * A ausência de qualquer um é uma violação.
 */
export const REQUIRED_ELEMENTS = {
  /** Variante "clinical" DEVE conter */
  clinical: [
    "Clinical Activity Report",          // Título oficial
    "Quick View",                         // Seção de resumo rápido
    "Data index (non-interpretative)",    // Subtítulo do Quick View
    "per instrument definition",          // Qualificador do Band/severity
    "Activity History",                   // Seção de histórico
    "Score History",                      // Seção de gráfico
    "Data Integrity",                     // Seção de integridade
    "Audit Trail",                        // Seção de auditoria
    "predefined scoring threshold",       // Disclaimer de flags
    "planned for a future update",        // Hash-chain disclaimer
    "platform-generated data",            // Disclaimer geral
  ],
  /** Variante "patient" NÃO deve conter */
  patient_excluded: [
    "Audit Trail",
    "Clinical Flags",
    "Band:",
  ],
} as const;

// ── 4. FUNÇÕES DE VALIDAÇÃO ────────────────────────────────────────────────

export interface ReportValidationInput {
  patientId: string;
  workspaceId: string;
  from: string;
  to: string;
  therapistName: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validação PRÉ-GERAÇÃO — verifica os dados de entrada.
 * Chamada ANTES de iniciar a construção do PDF.
 */
export function validateReportInput(
  input: ReportValidationInput,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // UUIDs obrigatórios
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(input.patientId)) {
    errors.push("patientId inválido (deve ser UUID).");
  }
  if (!uuidRe.test(input.workspaceId)) {
    errors.push("workspaceId inválido (deve ser UUID).");
  }

  // Datas
  const fromDate = new Date(input.from);
  const toDate = new Date(input.to);
  if (isNaN(fromDate.getTime())) errors.push("Data 'from' inválida.");
  if (isNaN(toDate.getTime())) errors.push("Data 'to' inválida.");
  if (fromDate >= toDate)
    errors.push("Data 'from' deve ser anterior a 'to'.");

  // Intervalo máximo: 2 anos (segurança contra relatórios gigantes)
  const twoYearsMs = 2 * 365 * 24 * 60 * 60 * 1000;
  if (toDate.getTime() - fromDate.getTime() > twoYearsMs) {
    warnings.push("Intervalo superior a 2 anos — relatório pode ficar extenso.");
  }

  // Terapeuta
  if (!input.therapistName || input.therapistName.trim().length < 2) {
    errors.push("Nome do terapeuta é obrigatório (mín. 2 caracteres).");
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validação PÓS-GERAÇÃO — verifica o PDF resultante.
 * Chamada DEPOIS de gerar o ArrayBuffer, ANTES de retornar ao cliente.
 *
 * Verifica:
 *   1. Tamanho mínimo (PDF vazio ou corrompido)
 *   2. Magic bytes (%PDF)
 *   3. Tamanho máximo (proteção contra explosão de memória)
 */
export function validateGeneratedPDF(
  pdfBytes: ArrayBuffer,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Tamanho mínimo: 1KB (PDF válido mínimo com conteúdo)
  if (pdfBytes.byteLength < 1024) {
    errors.push(
      `PDF muito pequeno (${pdfBytes.byteLength} bytes). Provavelmente corrompido.`,
    );
  }

  // Tamanho máximo: 10MB (relatório com muitas páginas)
  const MAX_SIZE = 10 * 1024 * 1024;
  if (pdfBytes.byteLength > MAX_SIZE) {
    errors.push(
      `PDF excede 10MB (${(pdfBytes.byteLength / 1024 / 1024).toFixed(1)}MB). Reduzir período.`,
    );
  }

  // Magic bytes: %PDF
  const header = new Uint8Array(pdfBytes.slice(0, 5));
  const magic = String.fromCharCode(...header);
  if (!magic.startsWith("%PDF")) {
    errors.push("Arquivo gerado não é um PDF válido (magic bytes ausentes).");
  }

  // Tamanho > 5MB = warning
  if (pdfBytes.byteLength > 5 * 1024 * 1024) {
    warnings.push("PDF acima de 5MB — considerar reduzir o intervalo.");
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Verifica se um texto contém palavras proibidas.
 * Utilizado para validar textos inseridos dinamicamente no relatório
 * (e.g. nomes de atividades, labels de flags).
 */
export function containsProhibitedWords(text: string): string[] {
  const lower = text.toLowerCase();
  return ALL_PROHIBITED.filter((word) => lower.includes(word.toLowerCase()));
}

/**
 * Verifica a integridade do checkPage — dado um Y atual e o tamanho
 * do próximo bloco, retorna se é necessário quebrar a página.
 *
 * Esta é a REGRA CENTRAL de paginação. Todo bloco novo DEVE chamar
 * esta função antes de desenhar.
 */
export function needsPageBreak(
  currentY: number,
  blockHeight: number,
): boolean {
  const safeBottom =
    COMPLIANCE_RULES.PAGE_HEIGHT -
    COMPLIANCE_RULES.FOOTER_Y_OFFSET -
    4;
  return currentY + blockHeight > safeBottom;
}

/**
 * Calcula o Y seguro para iniciar conteúdo numa página nova.
 * Após header redraw, o conteúdo começa aqui.
 */
export function getContentStartY(): number {
  return COMPLIANCE_RULES.HEADER_HEIGHT + 6;
}

// ── 5. REGRAS DE NOMENCLATURA E WORDING ────────────────────────────────────

export const WORDING_RULES = {
  /** Título oficial do documento (NUNCA "Compliance Report" no corpo) */
  DOCUMENT_TITLE_CLINICAL: "Clinical Activity Report",
  DOCUMENT_TITLE_PATIENT: "Patient Activity Summary",

  /** Seção de resumo — wording exato */
  QUICK_VIEW_TITLE: "Quick View",
  QUICK_VIEW_SUBTITLE: "Data index (non-interpretative).",

  /** Severity/Band — formato exato */
  SEVERITY_FORMAT: "Band: {severity} (per instrument definition)",

  /** Flag disclaimer — texto exato */
  FLAG_DISCLAIMER:
    "This flag reflects a predefined scoring threshold within the instrument. Follow applicable legal and professional guidelines.",

  /** Hash-chain disclaimer — texto exato */
  HASH_CHAIN_DISCLAIMER:
    "Hash-chain verification is planned for a future update.",

  /** General disclaimer — texto exato */
  GENERAL_DISCLAIMER:
    "This report contains platform-generated data and does not replace professional clinical judgment.",

  /** Audit trail truncation — texto exato */
  AUDIT_TRUNCATION: COMPLIANCE_RULES.AUDIT_TRAIL_TRUNCATION_NOTE,
} as const;
