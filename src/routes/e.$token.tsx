/**
 * Rota PÚBLICA do link efêmero (/e/$token).
 *
 * Fluxo:
 *  1. Vinheta (3s brand intro)
 *  2. Introdução + consentimento
 *  3. Player da atividade (Card Sort / Cognitive Mapping)
 *  4. Submit → dados cifrados → countdown de 24h inicia
 *
 * Constraints (ephemeral-links-architecture):
 *  - Dados purgados após 24h do submit.
 *  - Sem layout autenticado. Sem sessão. Sem login.
 *  - Mensagem neutra para qualquer falha.
 *  - PHI nunca na URL/logs.
 */

import { createFileRoute, useParams } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import {
  resolveEphemeralToken,
  submitEphemeralResponse,
} from "@/features/ephemeral/ephemeral-public.functions";
import { ConsentGate } from "@/features/activities/components/ConsentGate";
import { VinhetaIntro } from "@/features/activities/components/VinhetaIntro";
import { DragDropRunner } from "@/features/library/runners/drag_drop/DragDropRunner";
import type {
  DragDropConfig,
  DragDropResponseData,
} from "@/features/library/runners/drag_drop/drag-drop-types";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/e/$token")({
  head: () => ({
    meta: [
      { title: "Atividade — Terapily" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EphemeralActivityPage,
});

const NEUTRAL_MESSAGE =
  "Este link não está disponível. Peça um novo link ao seu terapeuta.";

type PagePhase = "intro" | "consent" | "activity" | "declined" | "submitted";

function EphemeralActivityPage() {
  const { token } = useParams({ from: "/e/$token" });
  const [vinhetaDone, setVinhetaDone] = useState(false);
  const [phase, setPhase] = useState<PagePhase>("intro");

  const resolveQuery = useQuery({
    queryKey: ["ephemeral-activity", token],
    queryFn: async () => {
      try {
        return await resolveEphemeralToken({ data: { token } });
      } catch {
        return null;
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const submitMut = useMutation({
    mutationFn: async (responses: Record<string, unknown>) => {
      return submitEphemeralResponse({
        data: {
          token,
          responses,
          userAgent: navigator.userAgent,
        },
      });
    },
    onSuccess: () => setPhase("submitted"),
  });

  const handleConsentAccepted = useCallback(() => {
    setPhase("activity");
  }, []);

  const handleConsentDeclined = useCallback(() => {
    setPhase("declined");
  }, []);

  const handleDragDropComplete = useCallback(
    (responseData: DragDropResponseData) => {
      submitMut.mutate(responseData as unknown as Record<string, unknown>);
    },
    [submitMut],
  );

  // --- Vinheta ---
  if (!vinhetaDone) {
    return (
      <VinhetaIntro
        context="magic_link"
        onComplete={() => setVinhetaDone(true)}
      />
    );
  }

  const resolved = resolveQuery.data;

  // --- Error / loading ---
  if (resolveQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--cream)]">
        <p className="text-sm text-muted-foreground animate-pulse">
          Carregando…
        </p>
      </div>
    );
  }

  if (!resolved) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--cream)] p-6">
        <div className="max-w-md text-center space-y-4">
          <p className="text-sm text-muted-foreground">{NEUTRAL_MESSAGE}</p>
        </div>
      </div>
    );
  }

  // --- Declined ---
  if (phase === "declined") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--cream)] p-6">
        <div className="max-w-md text-center space-y-3">
          <p className="text-sm text-foreground font-medium">
            Tudo bem. Você pode fechar esta página.
          </p>
          <p className="text-xs text-muted-foreground">
            Se mudar de ideia, peça um novo link ao seu terapeuta.
          </p>
        </div>
      </div>
    );
  }

  // --- Submitted ---
  if (phase === "submitted") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--cream)] p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--sage)]/10">
            <svg
              className="h-8 w-8 text-[var(--sage)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-foreground">Pronto.</h2>
          <p className="text-sm text-muted-foreground">
            Suas respostas foram registradas. O terapeuta receberá o resultado.
          </p>
          <p className="text-xs text-muted-foreground/70">
            Você pode fechar esta página.
          </p>
        </div>
      </div>
    );
  }

  // --- Intro / Consent / Activity ---
  const config = resolved.config as Record<string, unknown>;

  if (phase === "intro") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--cream)] p-6">
        <div className="max-w-lg text-center space-y-6">
          <h1 className="text-2xl font-semibold text-foreground font-[var(--font-display)]">
            {resolved.activityTitle}
          </h1>
          {resolved.shortDescription && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {resolved.shortDescription}
            </p>
          )}
          <Button
            size="lg"
            onClick={() => setPhase("consent")}
            className="bg-[var(--sage)] text-white hover:bg-[var(--sage)]/90"
          >
            Começar
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "consent") {
    return (
      <ConsentGate
        activityTitle={resolved.activityTitle}
        activitySlug={resolved.activitySlug}
        patientActivityId={resolved.ephemeralActivityId}
        workspaceId={resolved.workspaceId}
        patientId={resolved.patientId}
        onAccepted={handleConsentAccepted}
        onDeclined={handleConsentDeclined}
      />
    );
  }

  // --- Activity Player ---
  if (resolved.archetype === "drag_drop") {
    return (
      <div className="min-h-screen bg-[var(--cream)]">
        <DragDropRunner
          config={config as unknown as DragDropConfig}
          onComplete={handleDragDropComplete}
        />
      </div>
    );
  }

  // Fallback for unsupported archetypes
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--cream)] p-6">
      <p className="text-sm text-muted-foreground">
        Este tipo de atividade ainda não é suportado em modo efêmero.
      </p>
    </div>
  );
}
