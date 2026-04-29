import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { signupSchema, type SignupInput } from "@/lib/validation/schemas";
import { useRedirectIfAuthenticated } from "@/features/auth/useRedirectIfAuthenticated";
import { AuthShell } from "@/components/brand/AuthShell";
import { GoogleButton } from "@/components/brand/GoogleButton";
import { CapsLockHint } from "@/components/brand/CapsLockHint";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [{ title: "Create account · Terapily" }],
  }),
  component: SignupPage,
});

function SignupPage() {
  const [submitting, setSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState<string | null>(null);
  useRedirectIfAuthenticated("/welcome");

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
      const msg = error.message.toLowerCase();
      // HIBP rejection — Supabase returns "pwned" / "compromised" wording
      if (msg.includes("pwned") || msg.includes("compromised") || msg.includes("breach")) {
        toast.error(
          "This password has appeared in a known data breach. Please choose a different one."
        );
        return;
      }
      // Generic — does not leak whether the email is already registered
      if (msg.includes("registered")) {
        toast.error("We couldn't create an account with those details.");
      } else {
        toast.error("Something didn't work. Please try again.");
      }
      return;
    }

    setEmailSent(values.email);
  };

  if (emailSent) {
    return (
      <AuthShell
        eyebrow="Almost there"
        title="Confirm your email."
        subtitle={`We sent a link to ${emailSent}. Open it to activate your account.`}
        footer={
          <span>
            Wrong email?{" "}
            <Link
              to="/signup"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Sign up again
            </Link>
          </span>
        }
      >
        <div className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
          No rush. The link is valid for 24 hours. If you don&apos;t see it,
          check your spam folder.
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Create account"
      title="Start your trial."
      subtitle="14 days to try everything. No card required."
      footer={
        <span>
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </span>
      }
    >
      <GoogleButton label="Sign up with Google" />

      <div className="my-8 flex items-center gap-4">
        <div className="h-px flex-1 bg-border" />
        <span className="eyebrow text-muted-foreground">or with email</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="full_name">Full name</Label>
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
          <Label htmlFor="email">Work email</Label>
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
          <Label htmlFor="password">Password</Label>
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
              Minimum 8 characters. We check against known breaches.
            </p>
          )}
          <CapsLockHint />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create account"}
        </button>

        <p className="text-center text-xs text-muted-foreground">
          By continuing you agree to our terms.
        </p>
      </form>
    </AuthShell>
  );
}
