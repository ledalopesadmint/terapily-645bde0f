import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/AuthProvider";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand/Logo";
import { profileUpdateSchema } from "@/lib/validation/schemas";
import { updateProfile } from "@/features/auth/profile.functions";

export const Route = createFileRoute("/_authenticated/welcome")({
  head: () => ({
    meta: [
      { title: "Bem-vinda · Terapily" },
      {
        name: "description",
        content:
          "Onboarding inicial — confirme seu perfil e comece sua avaliação de 14 dias.",
      },
    ],
  }),
  component: WelcomePage,
});

interface FormState {
  full_name: string;
  country: string;
  license_number: string;
  npi: string;
}

function WelcomePage() {
  const { profile, refresh } = useAuth();
  const navigate = useNavigate();
  const updateProfileFn = useServerFn(updateProfile);

  const [form, setForm] = useState<FormState>({
    full_name: profile?.full_name ?? "",
    country: "",
    license_number: "",
    npi: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hidrata o nome quando o profile chegar (em hard refresh)
  useEffect(() => {
    if (profile?.full_name && !form.full_name) {
      setForm((f) => ({ ...f, full_name: profile.full_name ?? "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.full_name]);

  const update = (field: keyof FormState) => (value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    // Valida client-side com o MESMO schema do server (regra future-proof)
    const parsed = profileUpdateSchema.safeParse({
      full_name: form.full_name.trim(),
      country: form.country.trim() ? form.country.trim().toUpperCase() : null,
      license_number: form.license_number.trim() || null,
      npi: form.npi.trim() || null,
      locale: profile?.locale ?? "pt-BR",
      timezone: profile?.timezone ?? "America/Sao_Paulo",
    });

    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormState, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FormState;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProfileFn({ data: parsed.data });
      await refresh();
      toast.success("Salvo.", {
        description: "Seu perfil está pronto. Vamos começar.",
      });
      void navigate({ to: "/dashboard" });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Algo não funcionou.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSkip() {
    // Permite pular se o nome já existe (vindo do signup)
    if (!profile?.full_name) {
      toast.error("Precisamos do seu nome pra começar.");
      return;
    }
    void navigate({ to: "/dashboard" });
  }

  // Wrapper visual sem AppShell — onboarding é uma tela editorial dedicada
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Logo size="sm" />
          <p className="eyebrow !text-muted-foreground">Passo 1 de 1</p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-16 sm:py-20">
        <Eyebrow>Bem-vinda</Eyebrow>
        <h1 className="mt-4 font-display text-5xl leading-tight text-foreground sm:text-6xl">
          Pronto. Vamos começar.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Antes de abrir seu painel, confirme algumas informações do seu
          perfil. Só o nome é obrigatório — o resto pode esperar.
        </p>

        <form onSubmit={handleSubmit} className="mt-12 space-y-7" noValidate>
          {/* Nome completo */}
          <div className="space-y-2">
            <Label htmlFor="full_name" className="text-sm font-medium">
              Nome completo
            </Label>
            <Input
              id="full_name"
              type="text"
              value={form.full_name}
              onChange={(e) => update("full_name")(e.target.value)}
              required
              autoComplete="name"
              aria-invalid={!!errors.full_name}
              aria-describedby={errors.full_name ? "full_name-error" : undefined}
            />
            {errors.full_name && (
              <p id="full_name-error" className="text-xs text-destructive">
                {errors.full_name}
              </p>
            )}
          </div>

          {/* Bloco "Recomendado pra perfil completo" */}
          <div className="rounded-lg border border-border bg-card/50 p-5">
            <p className="eyebrow !text-secondary-foreground">
              Recomendado pra perfil completo
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Pacientes e colegas verão estas informações se você publicar seu
              perfil. Você pode preencher depois em Ajustes.
            </p>

            <div className="mt-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="country" className="text-sm font-medium">
                  País <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Input
                  id="country"
                  type="text"
                  placeholder="BR"
                  maxLength={2}
                  value={form.country}
                  onChange={(e) =>
                    update("country")(e.target.value.toUpperCase())
                  }
                  className="uppercase"
                  aria-invalid={!!errors.country}
                />
                <p className="text-xs text-muted-foreground">
                  Código ISO de 2 letras (ex: BR, PT, US).
                </p>
                {errors.country && (
                  <p className="text-xs text-destructive">{errors.country}</p>
                )}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="license_number" className="text-sm font-medium">
                    Registro profissional{" "}
                    <span className="text-muted-foreground">(opcional)</span>
                  </Label>
                  <Input
                    id="license_number"
                    type="text"
                    placeholder="CRP 06/12345"
                    value={form.license_number}
                    onChange={(e) => update("license_number")(e.target.value)}
                    aria-invalid={!!errors.license_number}
                  />
                  {errors.license_number && (
                    <p className="text-xs text-destructive">
                      {errors.license_number}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="npi" className="text-sm font-medium">
                    NPI{" "}
                    <span className="text-muted-foreground">(opcional · EUA)</span>
                  </Label>
                  <Input
                    id="npi"
                    type="text"
                    placeholder="0000000000"
                    value={form.npi}
                    onChange={(e) => update("npi")(e.target.value)}
                    aria-invalid={!!errors.npi}
                  />
                  {errors.npi && (
                    <p className="text-xs text-destructive">{errors.npi}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleSkip}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              disabled={isSubmitting}
            >
              Preencher depois
            </button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-w-[180px]"
            >
              {isSubmitting ? "Salvando…" : "Continuar pro painel"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
