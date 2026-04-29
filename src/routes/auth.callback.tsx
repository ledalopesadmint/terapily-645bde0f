import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/brand/AuthShell";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: "Conectando · Terapily" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let resolved = false;

    const goHome = (hasSession: boolean) => {
      if (cancelled || resolved) return;
      resolved = true;
      void navigate({ to: hasSession ? "/welcome" : "/login", replace: true });
    };

    // 1) Listener: dispara assim que o SDK consumir o hash
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) goHome(true);
    });

    // 2) Polling defensivo (caso o evento não dispare por race)
    const poll = setInterval(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) goHome(true);
    }, 400);

    // 3) Timeout final: se em 8s não houve sessão, manda pro login
    const timeout = setTimeout(() => {
      if (resolved) return;
      void supabase.auth.getSession().then(({ data }) => {
        if (data.session) goHome(true);
        else {
          setStuck(true);
          // não redireciona — deixa o usuário ver mensagem clara
        }
      });
    }, 8000);

    return () => {
      cancelled = true;
      clearInterval(poll);
      clearTimeout(timeout);
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  if (stuck) {
    return (
      <AuthShell
        eyebrow="Quase lá"
        title="Não conseguimos completar o login."
        subtitle="Pode ter sido um popup bloqueado ou cookies de terceiros. Tente novamente."
        footer={
          <span>
            <Link
              to="/login"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Voltar para o login
            </Link>
          </span>
        }
      >
        <div className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
          Dica: permita popups e cookies para <strong>terapily.com</strong> e tente
          novamente. Se o problema persistir, use email e senha.
        </div>
      </AuthShell>
    );
  }

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
