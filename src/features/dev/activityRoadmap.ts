// Catálogo de acompanhamento das 50 atividades do acervo Terapily.
// Cada item mapeia o exercício para o arquétipo de tool/jogo que vamos
// construir, a semana planejada e o status atual.
//
// Fonte: terapily-50-homework-activities.pdf + estratégia "5 arquétipos"
// (mem://features/roadmap-6-weeks). Quando a tabela `activity_catalog`
// existir (S2.5/S3), esta lista migra para o banco sem mudar a UI.

export type Archetype =
  | "quiz_scale"        // Quiz / escala validada (PHQ-9, GAD-7...)
  | "structured_form"   // Formulário guiado (thought record, sleep diary)
  | "drag_drop"         // Drag & drop / ranking / categorização
  | "guided_timer"      // Timer guiado (respiração, mindfulness, exposição)
  | "guided_script"     // Script passo-a-passo / branching (safety plan, exposição)
  | "tagging_game"      // Tagging / rotular emoções, distorções
  | "sentence_builder"  // Construir frases (defusion, reframing)
  | "journal";          // Escrita livre estruturada (gratitude, values)

export type ActivityStatus =
  | "planned"      // só na lista
  | "speccing"     // schema JSON em desenho
  | "in_progress" // componente sendo construído
  | "ready"        // disponível no acervo
  | "blocked";     // depende de algo (ex: PDF engine, magic link)

export type Approach =
  | "CBT"
  | "DBT"
  | "ACT"
  | "Trauma"
  | "Mindfulness"
  | "Behavioral"
  | "Sleep"
  | "Crisis"
  | "Positive"
  | "Couples"
  | "Parenting"
  | "Substance";

export interface ActivityRoadmapItem {
  code: string;
  name: string;
  approach: Approach;
  archetype: Archetype;
  week: "S2" | "S2.5" | "S3" | "S4" | "S5" | "S6" | "post-MVP";
  status: ActivityStatus;
  notes?: string;
}

export const ACTIVITY_ROADMAP: ActivityRoadmapItem[] = [
  // CBT
  { code: "CBT-01", name: "Thought Record (3 colunas)", approach: "CBT", archetype: "structured_form", week: "S3", status: "planned" },
  { code: "CBT-02", name: "Thought Record (7 colunas)", approach: "CBT", archetype: "structured_form", week: "S3", status: "planned" },
  { code: "CBT-03", name: "Cognitive Distortions Tagging", approach: "CBT", archetype: "tagging_game", week: "S3", status: "planned" },
  { code: "CBT-04", name: "Behavioral Activation Schedule", approach: "Behavioral", archetype: "structured_form", week: "S3", status: "planned" },
  { code: "CBT-05", name: "Activity & Mood Log", approach: "Behavioral", archetype: "structured_form", week: "S3", status: "planned" },
  { code: "CBT-06", name: "Worry Time", approach: "CBT", archetype: "guided_timer", week: "S4", status: "planned" },
  { code: "CBT-07", name: "Decatastrophizing Worksheet", approach: "CBT", archetype: "structured_form", week: "S4", status: "planned" },
  { code: "CBT-08", name: "Evidence For / Against", approach: "CBT", archetype: "structured_form", week: "S3", status: "planned" },
  { code: "CBT-09", name: "Reframing the Thought", approach: "CBT", archetype: "sentence_builder", week: "S4", status: "planned" },
  { code: "CBT-10", name: "Problem Solving Worksheet", approach: "CBT", archetype: "structured_form", week: "S4", status: "planned" },

  // Exposure / Trauma
  { code: "EXP-01", name: "Exposure Hierarchy / Ladder", approach: "CBT", archetype: "drag_drop", week: "S4", status: "planned" },
  { code: "EXP-02", name: "Exposure Session Log", approach: "CBT", archetype: "structured_form", week: "S4", status: "planned" },
  { code: "EXP-03", name: "SUDS Tracker", approach: "CBT", archetype: "quiz_scale", week: "S3", status: "planned" },
  { code: "TRA-01", name: "Trauma Narrative (estruturado)", approach: "Trauma", archetype: "structured_form", week: "S5", status: "planned", notes: "Sensível — gating Practice + audit reforçado" },
  { code: "TRA-02", name: "Grounding 5-4-3-2-1", approach: "Trauma", archetype: "guided_script", week: "S3", status: "planned" },
  { code: "TRA-03", name: "Window of Tolerance Map", approach: "Trauma", archetype: "drag_drop", week: "S5", status: "planned" },

  // DBT
  { code: "DBT-01", name: "Diary Card", approach: "DBT", archetype: "structured_form", week: "S4", status: "planned" },
  { code: "DBT-02", name: "TIPP (skills crise)", approach: "DBT", archetype: "guided_script", week: "S3", status: "planned" },
  { code: "DBT-03", name: "DEAR MAN (assertividade)", approach: "DBT", archetype: "sentence_builder", week: "S4", status: "planned" },
  { code: "DBT-04", name: "Opposite Action", approach: "DBT", archetype: "guided_script", week: "S4", status: "planned" },
  { code: "DBT-05", name: "Wise Mind", approach: "DBT", archetype: "guided_script", week: "S4", status: "planned" },
  { code: "DBT-06", name: "Distress Tolerance Menu", approach: "DBT", archetype: "drag_drop", week: "S4", status: "planned" },

  // ACT
  { code: "ACT-01", name: "Values Card Sort", approach: "ACT", archetype: "drag_drop", week: "S4", status: "planned" },
  { code: "ACT-02", name: "Defusion: Leaves on a Stream", approach: "ACT", archetype: "guided_timer", week: "S4", status: "planned" },
  { code: "ACT-03", name: "I'm having the thought that...", approach: "ACT", archetype: "sentence_builder", week: "S4", status: "planned" },
  { code: "ACT-04", name: "Committed Action Plan", approach: "ACT", archetype: "structured_form", week: "S4", status: "planned" },
  { code: "ACT-05", name: "Bullseye (valores vivos)", approach: "ACT", archetype: "drag_drop", week: "S5", status: "planned" },

  // Mindfulness
  { code: "MIN-01", name: "Respiração 4-7-8", approach: "Mindfulness", archetype: "guided_timer", week: "S3", status: "planned" },
  { code: "MIN-02", name: "Box Breathing", approach: "Mindfulness", archetype: "guided_timer", week: "S3", status: "planned" },
  { code: "MIN-03", name: "Body Scan guiado", approach: "Mindfulness", archetype: "guided_timer", week: "S4", status: "planned" },
  { code: "MIN-04", name: "STOP skill", approach: "Mindfulness", archetype: "guided_script", week: "S3", status: "planned" },
  { code: "MIN-05", name: "Mindful Observation", approach: "Mindfulness", archetype: "guided_timer", week: "S4", status: "planned" },

  // Sleep
  { code: "SLP-01", name: "Sleep Diary (2 semanas)", approach: "Sleep", archetype: "structured_form", week: "S4", status: "planned" },
  { code: "SLP-02", name: "Stimulus Control Plan", approach: "Sleep", archetype: "structured_form", week: "S4", status: "planned" },
  { code: "SLP-03", name: "Wind-Down Routine Builder", approach: "Sleep", archetype: "drag_drop", week: "S5", status: "planned" },

  // Crisis
  { code: "CRI-01", name: "Safety Plan (Stanley-Brown)", approach: "Crisis", archetype: "guided_script", week: "S3", status: "planned", notes: "Crítico — disponível desde acervo inicial" },
  { code: "CRI-02", name: "Coping Card", approach: "Crisis", archetype: "structured_form", week: "S3", status: "planned" },
  { code: "CRI-03", name: "Reasons for Living", approach: "Crisis", archetype: "structured_form", week: "S4", status: "planned" },

  // Substance / Addiction
  { code: "SUB-01", name: "Cravings Log", approach: "Substance", archetype: "structured_form", week: "S4", status: "planned" },
  { code: "SUB-02", name: "Trigger Map", approach: "Substance", archetype: "drag_drop", week: "S5", status: "planned" },
  { code: "SUB-03", name: "Relapse Prevention Plan", approach: "Substance", archetype: "structured_form", week: "S5", status: "planned" },

  // Positive Psychology
  { code: "POS-01", name: "Gratitude Journal (3 itens)", approach: "Positive", archetype: "journal", week: "S3", status: "planned" },
  { code: "POS-02", name: "Three Good Things", approach: "Positive", archetype: "journal", week: "S3", status: "planned" },
  { code: "POS-03", name: "Self-Compassion Letter", approach: "Positive", archetype: "journal", week: "S5", status: "planned" },
  { code: "POS-04", name: "Best Possible Self", approach: "Positive", archetype: "journal", week: "S5", status: "planned" },

  // Couples / Parenting
  { code: "CPL-01", name: "Communication Soft Start-up", approach: "Couples", archetype: "sentence_builder", week: "post-MVP", status: "planned" },
  { code: "CPL-02", name: "Weekly Check-in (casal)", approach: "Couples", archetype: "structured_form", week: "post-MVP", status: "planned" },
  { code: "PAR-01", name: "Time-out Plan (parental)", approach: "Parenting", archetype: "guided_script", week: "post-MVP", status: "planned" },
  { code: "PAR-02", name: "Behavior Tracker (criança)", approach: "Parenting", archetype: "structured_form", week: "post-MVP", status: "planned" },

  // Behavioral
  { code: "BEH-01", name: "Habit Tracker", approach: "Behavioral", archetype: "structured_form", week: "S5", status: "planned" },
  { code: "BEH-02", name: "Reward Menu", approach: "Behavioral", archetype: "drag_drop", week: "S5", status: "planned" },
];

export const ARCHETYPE_LABEL: Record<Archetype, string> = {
  quiz_scale: "Quiz / Escala",
  structured_form: "Form. estruturado",
  drag_drop: "Drag & Drop",
  guided_timer: "Timer guiado",
  guided_script: "Script guiado",
  tagging_game: "Tagging game",
  sentence_builder: "Sentence builder",
  journal: "Journal",
};

export const STATUS_LABEL: Record<ActivityStatus, string> = {
  planned: "Planejada",
  speccing: "Em spec",
  in_progress: "Construindo",
  ready: "Pronta",
  blocked: "Bloqueada",
};

export const STATUS_TONE: Record<ActivityStatus, string> = {
  planned: "bg-muted text-muted-foreground",
  speccing: "bg-accent/20 text-accent-foreground",
  in_progress: "bg-primary/15 text-primary",
  ready: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  blocked: "bg-destructive/15 text-destructive",
};
