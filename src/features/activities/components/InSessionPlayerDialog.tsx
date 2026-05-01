/**
 * In-session player modal — terapeuta aplica atividade ao vivo.
 * Reutiliza ActivityPlayer + recordInSessionResponse.
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

import {
  ActivityPlayer,
  getCompletionStats,
  type QuizConfig,
} from "./ActivityPlayer";
import {
  getActivityConfig,
  recordInSessionResponse,
} from "@/features/activities/activities.functions";

interface InSessionPlayerProps {
  patientActivityId: string;
  patientId: string;
  workspaceId: string;
  activityTitle: string;
  onClose: () => void;
}

export function InSessionPlayerDialog({
  patientActivityId,
  patientId,
  workspaceId,
  activityTitle,
  onClose,
}: InSessionPlayerProps) {
  const qc = useQueryClient();
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const configQuery = useQuery({
    queryKey: ["activity-config", patientActivityId],
    queryFn: () =>
      getActivityConfig({ data: { patientActivityId } }),
  });

  const config = (configQuery.data?.activity?.config ?? {}) as QuizConfig;
  const { total, answered, completion, allAnswered } = getCompletionStats(
    config,
    responses,
  );

  const submitMutation = useMutation({
    mutationFn: () =>
      recordInSessionResponse({
        data: { patientActivityId, responses },
      }),
    onSuccess: (res) => {
      setSubmitted(true);
      qc.invalidateQueries({
        queryKey: ["patient-activities", patientId, workspaceId],
      });
      if (res.clinicalFlag?.raised) {
        toast.warning(
          `⚠️ Flag clínica detectada: ${res.clinicalFlag.flag}`,
          { duration: 10_000 },
        );
      }
    },
    onError: (e) => {
      toast.error(
        e instanceof Error ? e.message : "Não foi possível registrar.",
      );
    },
  });

  if (configQuery.isLoading) {
    return (
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <p className="text-muted-foreground py-8 text-center">
            Carregando atividade…
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  if (configQuery.isError) {
    return (
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Erro</DialogTitle>
            <DialogDescription>
              Não foi possível carregar a atividade.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={onClose}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (submitted) {
    const result = submitMutation.data;
    return (
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atividade registrada</DialogTitle>
            <DialogDescription>
              {result?.score != null && (
                <span className="block mt-2 text-base">
                  Score: <strong>{result.score}</strong>
                  {result.severity && result.severity !== "not_applicable" && (
                    <span className="text-muted-foreground">
                      {" "}
                      · {result.severity}
                    </span>
                  )}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={onClose}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            {activityTitle}
          </DialogTitle>
          <DialogDescription>
            Aplicação em sessão. Passe o dispositivo ao paciente ou
            registre as respostas junto com ele.
          </DialogDescription>
        </DialogHeader>

        {config?.introduction && (
          <p className="text-sm text-muted-foreground">{config.introduction}</p>
        )}

        {total > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {answered} de {total}
              </span>
              <span>{completion}%</span>
            </div>
            <Progress value={completion} className="h-1.5" />
          </div>
        )}

        <ActivityPlayer
          config={config}
          responses={responses}
          onResponse={(qId, val) =>
            setResponses((prev) => ({ ...prev, [qId]: val }))
          }
        />

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={!allAnswered || submitMutation.isPending}
            onClick={() => submitMutation.mutate()}
          >
            {submitMutation.isPending ? "Registrando…" : "Registrar respostas"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
