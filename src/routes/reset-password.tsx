import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { resetPasswordSchema } from "@/lib/validation/schemas";
import { AuthShell } from "@/components/brand/AuthShell";
import { CapsLockHint } from "@/components/brand/CapsLockHint";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormValues = z.infer<typeof resetPasswordSchema>;

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [{ title: "New password · Terapily" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Supabase puts tokens in the hash (#access_token=...&type=recovery).
  // The client SDK consumes them automatically via onAuthStateChange.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });
    // In case the event fired before the listener was set up
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
      const msg = error.message.toLowerCase();
      if (msg.includes("pwned") || msg.includes("compromised") || msg.includes("breach")) {
        toast.error(
          "This password has appeared in a known data breach. Please choose a different one."
        );
        return;
      }
      toast.error("We couldn't update your password. Try the link again.");
      return;
    }
    toast.success("Password updated.");
    void navigate({ to: "/welcome" });
  };

  return (
    <AuthShell
      eyebrow="New password"
      title="Set a new password."
      subtitle="Minimum 8 characters. We check against known breaches."
    >
      {!ready ? (
        <p className="text-sm text-muted-foreground">
          Validating your recovery link…
        </p>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
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
            <CapsLockHint />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save new password"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
