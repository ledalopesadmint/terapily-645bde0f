import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { loginSchema, type LoginInput } from "@/lib/validation/schemas";
import { AuthShell } from "@/components/brand/AuthShell";
import { GoogleButton } from "@/components/brand/GoogleButton";
import { CapsLockHint } from "@/components/brand/CapsLockHint";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Allowlist of safe internal redirect targets after login.
// Anything outside this list falls back to `/welcome` — protects against
// open-redirect (e.g. /login?redirect=https://evil.com).
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
    meta: [{ title: "Sign in · Terapily" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [submitting, setSubmitting] = useState(false);

  // Defesa: se o browser submeteu o form via GET (handler React não disparou),
  // a URL fica com ?email=...&password=... — limpa imediatamente do histórico
  // pra não vazar credencial em logs/replay.
  if (typeof window !== "undefined") {
    const url = new URL(window.location.href);
    if (url.searchParams.has("password") || url.searchParams.has("email")) {
      url.search = "";
      window.history.replaceState({}, "", url.toString());
    }
  }

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
      toast.error("Email or password don't match.");
      return;
    }

    toast.success("Welcome back.");
    void navigate({ to: search.redirect || "/welcome" });
  };

  return (
    <AuthShell
      eyebrow="Sign in"
      title="Welcome back."
      subtitle="Sign in to your account to continue."
      footer={
        <span>
          Don&apos;t have an account yet?{" "}
          <Link
            to="/signup"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Create account
          </Link>{" "}
          <span className="text-muted-foreground/70">
            · 14 days free, no card.
          </span>
        </span>
      }
    >
      <GoogleButton label="Continue with Google" />

      <div className="my-8 flex items-center gap-4">
        <div className="h-px flex-1 bg-border" />
        <span className="eyebrow text-muted-foreground">or with email</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
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
            <Label htmlFor="password">Password</Label>
            <Link
              to="/forgot-password"
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              Forgot password
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
          <CapsLockHint />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthShell>
  );
}
