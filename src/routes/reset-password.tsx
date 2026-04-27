import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { resetPasswordSchema } from "@/lib/validation/schemas";
import { AuthShell } from "@/components/brand/AuthShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormValues = z.infer<typeof resetPasswordSchema>;

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [{ title: "Nova senha · Terapily" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Supabase coloca tokens no hash (#access_token=...&type=recovery)
  // O client SDK consome automaticamente via onAuthStateChange.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });
    // Caso o evento já tenha acontecido antes do listener
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async ({ password }: FormValues) => {
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      toast.error("Não conseguimos atualizar sua senha. Tente o link de novo.");
      return;
    }
    toast.success("Senha atualizada.");
    void navigate({ to: "/welcome" });
  };

  return (
    <AuthShell
      eyebrow="Nova senha"
      title="Crie uma senha nova."
      subtitle="Mínimo 8 caracteres. Verificamos contra vazamentos conhecidos."
    >
      {!ready ? (
        <p className="text-sm text-muted-foreground">
          Validando seu link de recuperação…
        </p>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="password">Nova senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register("password")}
              aria-invalid={!!errors.password}
            />
            {errors.password && (
              <p className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? "Salvando…" : "Salvar nova senha"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
