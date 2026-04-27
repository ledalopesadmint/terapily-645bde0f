import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/features/auth/AuthProvider";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { EmptyState } from "@/components/feedback/EmptyState";

export const Route = createFileRoute("/_authenticated/welcome")({
  head: () => ({
    meta: [{ title: "Bem-vinda · Terapily" }],
  }),
  component: WelcomePage,
});

function WelcomePage() {
  const { profile, workspace } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0] ?? "";

  const trialEndsAt = workspace?.trial_ends_at
    ? new Date(workspace.trial_ends_at)
    : null;
  const daysLeft = trialEndsAt
    ? Math.max(
        0,
        Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      )
    : null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
      <Eyebrow>Bem-vinda</Eyebrow>
      <h1 className="mt-4 font-display text-5xl leading-tight text-foreground sm:text-6xl">
        Olá{firstName ? `, ${firstName}` : ""}.
      </h1>
      <p className="mt-4 max-w-xl text-lg text-muted-foreground">
        Esta é a sua casa silenciosa de trabalho. Em breve, aqui dentro vão
        viver suas atividades, jogos terapêuticos e o fluxo das sessões.
      </p>

      {daysLeft !== null && (
        <p className="mt-8 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{daysLeft} dias</span>{" "}
          de avaliação restantes.
        </p>
      )}

      <div className="mt-12">
        <EmptyState
          title="O painel completo chega na próxima semana."
          description="Estamos construindo com cuidado. Por enquanto, sua conta está pronta e segura."
          comingSoonWeek="Semana 2"
        />
      </div>
    </main>
  );
}
