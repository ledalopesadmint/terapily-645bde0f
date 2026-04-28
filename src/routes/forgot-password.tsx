import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { resetPasswordRequestSchema } from "@/lib/validation/schemas";
import { AuthShell } from "@/components/brand/AuthShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormValues = z.infer<typeof resetPasswordRequestSchema>;

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [{ title: "Recover access · Terapily" }],
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
    // Always confirm (do not leak whether the email exists)
    setSent(true);
  };

  if (sent) {
    return (
      <AuthShell
        eyebrow="Sent"
        title="Check your email."
        subtitle="If an account with that email exists, you'll get a link to set a new password."
        footer={
          <Link
            to="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        }
      >
        <p className="text-sm text-muted-foreground">
          The link expires in one hour. If it doesn&apos;t arrive, check your
          spam folder.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Recover access"
      title="We'll send you a link."
      subtitle="Enter your email and we'll handle the rest."
      footer={
        <Link
          to="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      }
    >
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
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {submitting ? "Sending…" : "Send link"}
        </button>
      </form>
    </AuthShell>
  );
}
