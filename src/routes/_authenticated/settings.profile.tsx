import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/AuthProvider";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { profileUpdateSchema } from "@/lib/validation/schemas";
import { updateProfile } from "@/features/auth/profile.functions";

export const Route = createFileRoute("/_authenticated/settings/profile")({
  head: () => ({
    meta: [{ title: "Perfil · Ajustes · Terapily" }],
  }),
  component: ProfileSettingsPage,
});

interface FormState {
  full_name: string;
  country: string;
  license_number: string;
  npi: string;
  locale: "pt-BR" | "en-US" | "es-ES";
  timezone: string;
}

function ProfileSettingsPage() {
  const { user, profile, refresh } = useAuth();
  const updateProfileFn = useServerFn(updateProfile);

  const [form, setForm] = useState<FormState>({
    full_name: profile?.full_name ?? "",
    country: "",
    license_number: "",
    npi: "",
    locale: (profile?.locale as FormState["locale"]) ?? "pt-BR",
    timezone: profile?.timezone ?? "America/Sao_Paulo",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hidrata quando o profile chegar (hard refresh)
  useEffect(() => {
    if (profile) {
      setForm((f) => ({
        ...f,
        full_name: profile.full_name ?? f.full_name,
        locale: (profile.locale as FormState["locale"]) ?? f.locale,
        timezone: profile.timezone ?? f.timezone,
      }));
    }
  }, [profile]);

  const set = (field: keyof FormState) => (value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const parsed = profileUpdateSchema.safeParse({
      full_name: form.full_name.trim(),
      country: form.country.trim() ? form.country.trim().toUpperCase() : null,
      license_number: form.license_number.trim() || null,
      npi: form.npi.trim() || null,
      locale: form.locale,
      timezone: form.timezone.trim(),
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
      toast.success("Salvo.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Algo não funcionou.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section>
      <Eyebrow>Perfil</Eyebrow>
      <h2 className="mt-2 font-display text-2xl text-foreground">
        Como você aparece no Terapily.
      </h2>

      {/* Email é read-only — vem do auth.users */}
      <div className="mt-6 rounded-lg border border-border/60 bg-card/40 px-4 py-3">
        <p className="text-xs text-muted-foreground">E-mail (não editável)</p>
        <p className="mt-1 text-sm font-medium text-foreground">
          {user?.email ?? "—"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6" noValidate>
        <div className="space-y-2">
          <Label htmlFor="full_name">Nome completo</Label>
          <Input
            id="full_name"
            type="text"
            value={form.full_name}
            onChange={(e) => set("full_name")(e.target.value)}
            required
            autoComplete="name"
            aria-invalid={!!errors.full_name}
          />
          {errors.full_name && (
            <p className="text-xs text-destructive">{errors.full_name}</p>
          )}
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="locale">Idioma</Label>
            <select
              id="locale"
              value={form.locale}
              onChange={(e) =>
                set("locale")(e.target.value as FormState["locale"])
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en-US">English (US)</option>
              <option value="es-ES">Español</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Fuso horário</Label>
            <Input
              id="timezone"
              type="text"
              value={form.timezone}
              onChange={(e) => set("timezone")(e.target.value)}
              placeholder="America/Sao_Paulo"
              aria-invalid={!!errors.timezone}
            />
            {errors.timezone && (
              <p className="text-xs text-destructive">{errors.timezone}</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border/60 bg-card/40 p-5">
          <p className="eyebrow !text-secondary-foreground">
            Recomendado pra perfil completo
          </p>

          <div className="mt-5 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="country">
                País <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="country"
                type="text"
                placeholder="BR"
                maxLength={2}
                value={form.country}
                onChange={(e) =>
                  set("country")(e.target.value.toUpperCase())
                }
                className="uppercase"
              />
              {errors.country && (
                <p className="text-xs text-destructive">{errors.country}</p>
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="license_number">
                  Registro profissional{" "}
                  <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Input
                  id="license_number"
                  type="text"
                  placeholder="CRP 06/12345"
                  value={form.license_number}
                  onChange={(e) => set("license_number")(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="npi">
                  NPI{" "}
                  <span className="text-muted-foreground">
                    (opcional · EUA)
                  </span>
                </Label>
                <Input
                  id="npi"
                  type="text"
                  placeholder="0000000000"
                  value={form.npi}
                  onChange={(e) => set("npi")(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isSubmitting} className="min-w-[140px]">
            {isSubmitting ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </form>
    </section>
  );
}
