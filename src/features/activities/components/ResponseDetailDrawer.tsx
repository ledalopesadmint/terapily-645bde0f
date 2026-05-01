/**
 * ResponseDetailDrawer — decifra e mostra respostas de uma atividade completa.
 * Terapeuta clica "Ver respostas" → on-demand decrypt + render.
 */

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { getActivityResponseDetail } from "@/features/activities/activities.functions";
import type { QuizConfig, QuizQuestion } from "./ActivityPlayer";

interface ResponseDetailDrawerProps {
  responseId: string | null;
  workspaceId: string;
  onClose: () => void;
}

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
  const config = (detail?.activity?.config ?? {}) as QuizConfig;
  const questions: QuizQuestion[] = Array.isArray(config?.questions)
    ? config.questions
    : [];
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
            {/* Score summary */}
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

            {clinicalFlag?.flag && (
              <div className="rounded-md border-2 border-mauve bg-mauve/15 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-mauve" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      Flag clínica detectada · {clinicalFlag.flag.replace(/_/g, " ")}
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

            {/* Individual responses */}
            {questions.length > 0 ? (
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
              <div className="rounded-md border border-border p-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Respostas brutas:
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
