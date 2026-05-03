/**
 * Rota PÚBLICA do link efêmero (/e/$token).
 *
 * Fluxo: Vinheta → Intro → Consent → Player → Submit
 * Dados purgados 24h após submit.
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
  const [consentOpen, setConsentOpen] = useState(false);

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
        data: { token, responses, userAgent: navigator.userAgent },
      });
    },
    onSuccess: () => setPhase("submitted"),
  });

  const handleConsentAccepted = useCallback(() => {
    setConsentOpen(false);
    setPhase("activity");
  }, []);

  const handleConsentDeclined = useCallback(() => {
    setConsentOpen(false);
    setPhase("declined");
  }, []);

  const handleDragDropSubmit = useCallback(
    (responseData: DragDropResponseData) => {
      submitMut.mutate(responseData as unknown as Record<string, unknown>);
    },
    [submitMut],
  );

  // --- Vinheta ---
  if (!vinhetaDone) {
    return <VinhetaIntro onComplete={() => setVinhetaDone(true)} />;
  }

  const resolved = resolveQuery.data;

  if (resolveQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--cream)]">
        <p className="text-sm text-muted-foreground animate-pulse">Carregando…</p>
      </div>
    );
  }

  if (!resolved) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--cream)] p-6">
        <p className="text-sm text-muted-foreground">{NEUTRAL_MESSAGE}</p>
      </div>
    );
  }

  if (phase === "declined") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--cream)] p-6">
        <div className="max-w-md text-center space-y-3">
          <p className="text-sm text-foreground font-medium">Tudo bem. Você pode fechar esta página.</p>
          <p className="text-xs text-muted-foreground">Se mudar de ideia, peça um novo link ao seu terapeuta.</p>
        </div>
      </div>
    );
  }

  if (phase === "submitted") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--cream)] p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--sage)]/10">
            <svg className="h-8 w-8 text-[var(--sage)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-foreground">Pronto.</h2>
          <p className="text-sm text-muted-foreground">Suas respostas foram registradas. O terapeuta receberá o resultado.</p>
          <p className="text-xs text-muted-foreground/70">Você pode fechar esta página.</p>
        </div>
      </div>
    );
  }

  const config = resolved.config as Record<string, unknown>;

  if (phase === "intro") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--cream)] p-6">
        <div className="max-w-lg text-center space-y-6">
          <h1 className="text-2xl font-semibold text-foreground">{resolved.activityTitle}</h1>
          {resolved.shortDescription && (
            <p className="text-sm text-muted-foreground leading-relaxed">{resolved.shortDescription}</p>
          )}
          <Button
            size="lg"
            onClick={() => {
              setConsentOpen(true);
              setPhase("consent");
            }}
            className="bg-[var(--sage)] text-white hover:bg-[var(--sage)]/90"
          >
            Começar
          </Button>
        </div>
        <ConsentGate
          open={consentOpen}
          onAccept={handleConsentAccepted}
          onDecline={handleConsentDeclined}
          onClose={() => setConsentOpen(false)}
        />
      </div>
    );
  }

  if (phase === "consent") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--cream)] p-6">
        <ConsentGate
          open={true}
          onAccept={handleConsentAccepted}
          onDecline={handleConsentDeclined}
          onClose={() => setPhase("intro")}
        />
      </div>
    );
  }

  // --- Activity Player ---
  if (resolved.archetype === "drag_drop") {
    return (
      <div className="min-h-screen bg-[var(--cream)]">
        <DragDropRunner
          config={config as unknown as DragDropConfig}
          onSubmit={handleDragDropSubmit}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--cream)] p-6">
      <p className="text-sm text-muted-foreground">Este tipo de atividade ainda não é suportado em modo efêmero.</p>
    </div>
  );
}
