import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { signupSchema, type SignupInput } from "@/lib/validation/schemas";
import { AuthShell } from "@/components/brand/AuthShell";
import { GoogleButton } from "@/components/brand/GoogleButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [{ title: "Criar conta · Terapily" }],
  }),
  component: SignupPage,
});

function SignupPage() {
  const [submitting, setSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (values: SignupInput) => {
    setSubmitting(true);

    const emailRedirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback`
        : undefined;

    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo,
        data: { full_name: values.full_name },
      },
    });

    setSubmitting(false);

    if (error) {
      // Genérico — não vaza se e-mail já existe (boa prática)
      if (error.message.toLowerCase().includes("registered")) {
        toast.error("Não foi possível criar a conta com esses dados.");
      } else {
        toast.error("Algo não funcionou. Tente novamente.");
      }
      return;
    }

    setEmailSent(values.email);
  };

  if (emailSent) {
    return (
      <AuthShell
        eyebrow="Quase lá"
        title="Confirme seu e-mail."
        subtitle={`Enviamos um link para ${emailSent}. Abra-o para ativar sua conta.`}
        footer={
          <span>
            Errou o e-mail?{" "}
            <Link
              to="/signup"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Cadastrar de novo
            </Link>
          </span>
        }
      >
        <div className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
          Sem pressa. O link fica válido por 24 horas. Se não encontrar, dê
          uma olhada na pasta de spam.
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Criar conta"
      title="Comece sua avaliação."
      subtitle="14 dias para experimentar tudo. Sem cartão."
      footer={
        <span>
          Já tem uma conta?{" "}
          <Link
            to="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Entrar
          </Link>
        </span>
      }
    >
      <GoogleButton label="Criar conta com Google" />

      <div className="my-8 flex items-center gap-4">
        <div className="h-px flex-1 bg-border" />
        <span className="eyebrow text-muted-foreground">ou com e-mail</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="full_name">Nome completo</Label>
          <Input
            id="full_name"
            type="text"
            autoComplete="name"
            {...register("full_name")}
            aria-invalid={!!errors.full_name}
          />
          {errors.full_name && (
            <p className="text-xs text-destructive">
              {errors.full_name.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">E-mail profissional</Label>
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

        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...register("password")}
            aria-invalid={!!errors.password}
          />
          {errors.password ? (
            <p className="text-xs text-destructive">
              {errors.password.message}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Mínimo 8 caracteres. Verificamos contra vazamentos conhecidos.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {submitting ? "Criando…" : "Criar conta"}
        </button>

        <p className="text-center text-xs text-muted-foreground">
          Ao continuar, você concorda com nossos termos.
        </p>
      </form>
    </AuthShell>
  );
}
