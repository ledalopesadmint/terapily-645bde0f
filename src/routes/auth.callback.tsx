import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/brand/AuthShell";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [{ title: "Conectando · Terapily" }],
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // O SDK do Supabase consome os tokens do hash automaticamente.
    // Esperamos a sessão ficar disponível e redirecionamos.
    let cancelled = false;

    const settle = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        void navigate({ to: "/welcome", replace: true });
      } else {
        void navigate({ to: "/login", replace: true });
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "SIGNED_IN" && session) {
        void navigate({ to: "/welcome", replace: true });
      }
    });

    // Pequeno delay pra dar tempo do SDK processar o hash
    const t = setTimeout(() => void settle(), 200);

    return () => {
      cancelled = true;
      clearTimeout(t);
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <AuthShell
      eyebrow="Conectando"
      title="Um momento."
      subtitle="Estamos finalizando seu acesso."
    >
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/3 animate-pulse bg-primary" />
      </div>
    </AuthShell>
  );
}
