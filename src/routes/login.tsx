import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { loginSchema, type LoginInput } from "@/lib/validation/schemas";
import { AuthShell } from "@/components/brand/AuthShell";
import { GoogleButton } from "@/components/brand/GoogleButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Allowlist de destinos internos seguros para o redirect pós-login.
// Qualquer valor fora dessa lista cai no default `/welcome` — protege contra
// open redirect (ex.: /login?redirect=https://evil.com).
const SAFE_REDIRECTS = new Set<string>([
  "/welcome",
  "/dashboard",
  "/settings",
  "/settings/profile",
  "/settings/workspace",
  "/settings/security",
  "/settings/billing",
]);

function sanitizeRedirect(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;
  return SAFE_REDIRECTS.has(value) ? value : undefined;
}

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: sanitizeRedirect(search.redirect),
  }),
  head: () => ({
    meta: [{ title: "Entrar · Terapily" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginInput) => {
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword(values);
    setSubmitting(false);

    if (error) {
      // Mensagem genérica (não vaza se conta existe ou não)
      toast.error("E-mail ou senha não conferem.");
      return;
    }

    toast.success("Bem-vinda de volta.");
    void navigate({ to: search.redirect || "/welcome" });
  };

  return (
    <AuthShell
      eyebrow="Entrar"
      title="Bem-vinda de volta."
      subtitle="Entre na sua conta para continuar."
      footer={
        <span>
          Ainda não tem conta?{" "}
          <Link
            to="/signup"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Criar conta
          </Link>
        </span>
      }
    >
      <GoogleButton />

      <div className="my-8 flex items-center gap-4">
        <div className="h-px flex-1 bg-border" />
        <span className="eyebrow text-muted-foreground">ou com e-mail</span>
        <div className="h-px flex-1 bg-border" />
      </div>

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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Senha</Label>
            <Link
              to="/forgot-password"
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              Esqueci a senha
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
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
          {submitting ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </AuthShell>
  );
}
