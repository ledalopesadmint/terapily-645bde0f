/**
 * ResponseDetailDrawer — decifra e mostra respostas de uma atividade completa.
 * Terapeuta clica "Ver respostas" → on-demand decrypt + render.
 *
 * Para structured_form (worksheets): renderiza step-by-step com labels,
 * respostas escritas e barras de intensidade de emoção.
 * Para escalas (quiz): renderiza pergunta + opção selecionada.
 */

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Eye } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { getActivityResponseDetail } from "@/features/activities/activities.functions";
import type { QuizConfig, QuizQuestion } from "./ActivityPlayer";
import type {
  FormField,
  FormStep,
  StructuredFormConfig,
} from "@/features/library/runners/structured_form/form-types";

interface ResponseDetailDrawerProps {
  responseId: string | null;
  workspaceId: string;
  onClose: () => void;
}

// ── Emotion renderer ──────────────────────────────────────────
function EmotionDisplay({
  emotions,
}: {
  emotions: { name: string; intensity: number }[] | Record<string, unknown>[];
}) {
  if (!Array.isArray(emotions) || emotions.length === 0) return null;
  return (
    <div className="space-y-2">
      {emotions.map((e, i) => {
        const name =
          typeof e === "object" && "name" in e ? String(e.name) : `Emoção ${i + 1}`;
        const intensity =
          typeof e === "object" && "intensity" in e ? Number(e.intensity) : 0;
        return (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground">{name}</span>
              <span className="text-xs text-muted-foreground font-medium">
                {intensity}%
              </span>
            </div>
            <Progress value={intensity} className="h-2" />
          </div>
        );
      })}
    </div>
  );
}

// ── Single field renderer ─────────────────────────────────────
function FieldResponse({
  field,
  value,
}: {
  field: FormField;
  value: unknown;
}) {
  // emotion_picker → array of { name, intensity }
  if (field.type === "emotion_picker") {
    const emotions = Array.isArray(value)
      ? value
      : value != null && typeof value === "object" && Array.isArray((value as any).emotions)
        ? (value as any).emotions
        : [];
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">{field.label}</p>
        {emotions.length > 0 ? (
          <EmotionDisplay emotions={emotions} />
        ) : (
          <p className="text-sm text-muted-foreground italic">Não preenchido</p>
        )}
      </div>
    );
  }

  // Normalize options (DB stores plain strings, type expects {value,label})
  const normOpts = (field.options ?? []).map((o: any) =>
    typeof o === "string" ? { value: o, label: o } : o,
  );

  // multi_select → array of strings
  if (field.type === "multi_select" && Array.isArray(value)) {
    const labels = value.map((v) => {
      const opt = normOpts.find((o: any) => o.value === String(v));
      return opt?.label ?? String(v);
    });
    return (
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{field.label}</p>
        <div className="flex flex-wrap gap-1.5">
          {labels.map((l, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {l}
            </Badge>
          ))}
        </div>
      </div>
    );
  }

  // select / radio → resolve label
  if ((field.type === "select" || field.type === "radio") && normOpts.length) {
    const opt = normOpts.find((o: any) => o.value === String(value));
    return (
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{field.label}</p>
        <p className="text-sm text-foreground">
          {opt?.label ?? String(value ?? "—")}
        </p>
      </div>
    );
  }

  // slider / number → show value + bar
  if ((field.type === "slider" || field.type === "number") && value != null) {
    const num = Number(value);
    const min = field.min ?? 0;
    const max = field.max ?? 100;
    const pct = max > min ? ((num - min) / (max - min)) * 100 : 0;
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">{field.label}</p>
          <span className="text-xs text-muted-foreground font-medium">
            {num}{field.maxLabel ? ` — ${field.maxLabel}` : ""}
          </span>
        </div>
        <Progress value={pct} className="h-2" />
        {(field.minLabel || field.maxLabel) && (
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{field.minLabel ?? min}</span>
            <span>{field.maxLabel ?? max}</span>
          </div>
        )}
      </div>
    );
  }

  // checkbox
  if (field.type === "checkbox") {
    return (
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{field.label}</p>
        <p className="text-sm text-foreground">{value ? "Sim" : "Não"}</p>
      </div>
    );
  }

  // text / textarea / date / time / fallback
  const display = value != null && value !== "" ? String(value) : "—";
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-foreground">{field.label}</p>
      <p className="text-sm text-foreground whitespace-pre-wrap">{display}</p>
    </div>
  );
}

// ── Structured form step-by-step renderer ─────────────────────
function StructuredFormResponses({
  config,
  responses,
}: {
  config: StructuredFormConfig;
  responses: Record<string, unknown>;
}) {
  return (
    <div className="space-y-6">
      {config.steps.map((step, stepIdx) => (
        <div key={step.id} className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {stepIdx + 1}
            </span>
            <h3 className="text-sm font-semibold text-foreground">
              {step.title}
            </h3>
          </div>
          {step.description && (
            <p className="text-xs text-muted-foreground pl-8">
              {step.description}
            </p>
          )}
          <div className="space-y-4 pl-8">
            {step.fields.map((field) => {
              // Handle nested object for emotion_picker fields like "emotions" and "emotions_after"
              const raw = responses[field.id];
              return (
                <div
                  key={field.id}
                  className="rounded-md border border-border bg-muted/20 p-3"
                >
                  <FieldResponse field={field} value={raw} />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main drawer ───────────────────────────────────────────────
export function ResponseDetailDrawer({
  responseId,
  workspaceId,
  onClose,
}: ResponseDetailDrawerProps) {
  const detailQuery = useQuery({
    queryKey: ["activity-response-detail", responseId],
    queryFn: () =>
      getActivityResponseDetail({
        data: { responseId: responseId!, workspaceId },
      }),
    enabled: !!responseId,
  });

  const detail = detailQuery.data;
  const archetype = detail?.activity?.archetype;
  const isStructuredForm = archetype === "structured_form";

  const config = (detail?.activity?.config ?? {}) as unknown as QuizConfig & StructuredFormConfig;
  const questions: QuizQuestion[] = Array.isArray(config?.questions)
    ? config.questions
    : [];
  const steps: FormStep[] = Array.isArray(config?.steps) ? config.steps : [];

  const clinicalFlag =
    detail?.scoringMetadata && typeof detail.scoringMetadata === "object"
      ? (detail.scoringMetadata as { clinical_flag?: { flag?: string; item_id?: string | null } | null }).clinical_flag
      : null;

  return (
    <Sheet open={!!responseId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            {detail?.activity?.title ?? "Respostas"}
          </SheetTitle>
          <SheetDescription>
            Respostas decifradas sob demanda. Esta visualização é auditada.
          </SheetDescription>
        </SheetHeader>

        {detailQuery.isLoading && (
          <p className="text-sm text-muted-foreground py-6">
            Decifrando respostas…
          </p>
        )}

        {detailQuery.isError && (
          <p className="text-sm text-destructive py-6">
            Não foi possível carregar as respostas.
          </p>
        )}

        {detail && (
          <div className="space-y-6 py-4">
            {/* Score summary — only for scales, not worksheets */}
            {!isStructuredForm && (
              <div className="flex items-center gap-3 rounded-md border border-border bg-muted/30 p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Score total</p>
                  <p className="text-2xl font-semibold text-foreground">
                    {detail.score ?? "—"}
                  </p>
                </div>
                {detail.severity && detail.severity !== "not_applicable" && (
                  <Badge variant="secondary" className="ml-auto">
                    {detail.severity}
                  </Badge>
                )}
              </div>
            )}

            {clinicalFlag?.flag && (
              <div className="rounded-md border-2 border-mauve bg-mauve/15 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-mauve" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      Flag clínica detectada · {typeof clinicalFlag.flag === "string" ? clinicalFlag.flag.replace(/_/g, " ") : "Sinal clínico detectado"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Item {clinicalFlag.item_id?.replace(/^q/i, "") ?? "—"}. Evento registrado na auditoria.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                Enviado em{" "}
                {new Date(detail.submittedAt).toLocaleString("pt-BR")}
              </p>
              <p>Via: {detail.submittedVia === "in_session" ? "Sessão" : "Link"}</p>
            </div>

            {/* Structured form → step-by-step with labels */}
            {isStructuredForm && steps.length > 0 ? (
              <StructuredFormResponses
                config={config as unknown as StructuredFormConfig}
                responses={detail.responses as Record<string, unknown>}
              />
            ) : questions.length > 0 ? (
              /* Scales → question + selected option */
              <ol className="space-y-4">
                {questions.map((q, idx) => {
                  const rawValue = detail.responses[q.id];
                  const numValue =
                    typeof rawValue === "number"
                      ? rawValue
                      : typeof rawValue === "string"
                        ? Number(rawValue)
                        : null;
                  const selectedOption = q.options.find(
                    (o) => o.value === numValue,
                  );

                  return (
                    <li
                      key={q.id}
                      className="rounded-md border border-border p-4 space-y-2"
                    >
                      <p className="text-sm font-medium text-foreground">
                        {idx + 1}. {q.text}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={numValue != null ? "default" : "outline"}
                          className="text-xs"
                        >
                          {numValue ?? "—"}
                        </Badge>
                        {selectedOption && (
                          <span className="text-sm text-muted-foreground">
                            {selectedOption.label}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              /* Fallback for unknown archetypes */
              <div className="rounded-md border border-border p-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Respostas:
                </p>
                <pre className="text-xs whitespace-pre-wrap overflow-x-auto">
                  {JSON.stringify(detail.responses, null, 2)}
                </pre>
              </div>
            )}

            {/* Scoring metadata (clusters, etc.) */}
            {detail.scoringMetadata &&
              typeof detail.scoringMetadata === "object" &&
              "clusters" in (detail.scoringMetadata as Record<string, unknown>) && (
                <div className="rounded-md border border-border p-4 space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    Subscores por cluster
                  </p>
                  {Object.entries(
                    (detail.scoringMetadata as { clusters: Record<string, number> })
                      .clusters,
                  ).map(([name, score]) => (
                    <div
                      key={name}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground capitalize">
                        {name.replace(/_/g, " ")}
                      </span>
                      <span className="font-medium">{score}</span>
                    </div>
                  ))}
                </div>
              )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
