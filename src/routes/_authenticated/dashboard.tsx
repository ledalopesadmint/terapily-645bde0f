import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, GamepadIcon, ListChecks, BookOpen } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { EmptyState } from "@/components/feedback/EmptyState";
import { TRIAL_DURATION_DAYS } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel · Terapily" },
      {
        name: "description",
        content: "Seu painel clínico Terapily — pacientes, jogos e tarefas.",
      },
    ],
  }),
  component: DashboardPage,
});

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function DashboardPage() {
  const { profile, workspace } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0] ?? "";

  // Trial countdown
  const trialEndsAt = workspace?.trial_ends_at
    ? new Date(workspace.trial_ends_at)
    : null;
  const daysLeft = trialEndsAt
    ? Math.max(
        0,
        Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      )
    : null;
  const trialProgress =
    daysLeft !== null
      ? Math.min(
          100,
          Math.max(
            0,
            ((TRIAL_DURATION_DAYS - daysLeft) / TRIAL_DURATION_DAYS) * 100,
          ),
        )
      : 0;

  const trialEndDateFormatted = trialEndsAt
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(trialEndsAt)
    : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
      {/* Saudação editorial */}
      <header>
        <Eyebrow>Painel</Eyebrow>
        <h1 className="mt-3 font-display text-4xl leading-tight text-foreground sm:text-5xl">
          {getGreeting()}
          {firstName ? `, ${firstName}` : ""}.
        </h1>
        <p className="mt-3 max-w-xl text-base text-muted-foreground">
          Sua casa silenciosa de trabalho. Aqui você vai acompanhar pacientes,
          atividades e jogos terapêuticos — começando pelas próximas semanas.
        </p>
      </header>

      {/* Card de status do trial — ocupa destaque, é a única coisa "viva" hoje */}
      {daysLeft !== null && (
        <section className="mt-10 rounded-xl border border-border bg-card p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Eyebrow tone="sage">Avaliação ativa</Eyebrow>
              <p className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
                {daysLeft === 0
                  ? "Último dia da avaliação."
                  : daysLeft === 1
                    ? "1 dia restante."
                    : `${daysLeft} dias restantes.`}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {trialEndDateFormatted &&
                  `Sua avaliação de ${TRIAL_DURATION_DAYS} dias termina em ${trialEndDateFormatted}.`}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="font-display text-5xl text-primary">
                {daysLeft}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                de {TRIAL_DURATION_DAYS} dias
              </p>
            </div>
          </div>

          {/* Barra de progresso sutil */}
          <div
            className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={TRIAL_DURATION_DAYS}
            aria-valuenow={TRIAL_DURATION_DAYS - daysLeft}
            aria-label="Progresso da avaliação"
          >
            <div
              className="h-full bg-secondary transition-all"
              style={{ width: `${trialProgress}%` }}
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" aria-hidden />
              Sem cobrança automática
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-mauve" aria-hidden />
              Cobrança chega na Semana 2
            </span>
          </div>
        </section>
      )}

      {/* Próximas seções — EmptyStates honestos, voz Terapily */}
      <section className="mt-12">
        <Eyebrow>Em construção</Eyebrow>
        <h2 className="mt-2 font-display text-2xl text-foreground">
          O que vai viver aqui dentro.
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Estamos construindo com cuidado. Cada peça chega quando estiver
          ponta-a-ponta — sem mocks, sem fluxos quebrados.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <EmptyState
            icon={Users}
            title="Pacientes"
            description="Cadastro, contato e observações criptografadas. A primeira feature de domínio."
            comingSoonWeek="Semana 2"
          />
          <EmptyState
            icon={ListChecks}
            title="Tarefas (homework)"
            description="Atividades entre sessões, com acompanhamento clínico real."
            comingSoonWeek="Semana 3"
          />
          <EmptyState
            icon={GamepadIcon}
            title="Jogos terapêuticos"
            description="Começando pela Anatomia da Ansiedade. Acessíveis pelo paciente via link."
            comingSoonWeek="Semana 3"
          />
          <EmptyState
            icon={BookOpen}
            title="Notas de sessão"
            description="Linha do tempo do paciente, com criptografia ponta-a-ponta."
            comingSoonWeek="Semana 4"
          />
        </div>
      </section>

      {/* Rodapé editorial */}
      <section className="mt-16 border-t border-border/60 pt-8">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <Eyebrow tone="muted">Próximo passo</Eyebrow>
            <p className="mt-2 text-sm text-muted-foreground">
              Confira seu perfil em{" "}
              <Link
                to="/welcome"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                informações do perfil
              </Link>
              .
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Versão Semana 1 · Fundação
          </p>
        </div>
      </section>
    </div>
  );
}
