import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { resetPasswordRequestSchema } from "@/lib/validation/schemas";
import { AuthShell } from "@/components/brand/AuthShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormValues = z.infer<typeof resetPasswordRequestSchema>;

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [{ title: "Recuperar acesso · Terapily" }],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(resetPasswordRequestSchema),
  });

  const onSubmit = async ({ email }: FormValues) => {
    setSubmitting(true);
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/reset-password`
        : undefined;

    await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setSubmitting(false);
    // Sempre confirmamos (não vaza se o e-mail existe)
    setSent(true);
  };

  if (sent) {
    return (
      <AuthShell
        eyebrow="Enviado"
        title="Confira seu e-mail."
        subtitle="Se houver uma conta com esse e-mail, você vai receber um link para criar uma nova senha."
        footer={
          <Link
            to="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Voltar pro login
          </Link>
        }
      >
        <p className="text-sm text-muted-foreground">
          O link expira em uma hora. Se não chegar, verifique sua pasta de
          spam.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Recuperar acesso"
      title="Vamos te enviar um link."
      subtitle="Informe seu e-mail e nós cuidamos do resto."
      footer={
        <Link
          to="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Voltar pro login
        </Link>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            {...register("email")}
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {submitting ? "Enviando…" : "Enviar link"}
        </button>
      </form>
    </AuthShell>
  );
}
