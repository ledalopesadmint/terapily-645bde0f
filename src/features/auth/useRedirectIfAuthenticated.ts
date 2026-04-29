import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "./AuthProvider";

/**
 * Hook pra páginas de auth (login/signup): se o usuário já está autenticado
 * (ex: voltou do popup do Google sem passar pelo /auth/callback, ou abriu
 * /login em outra aba enquanto já estava logado), redireciona automaticamente
 * pro destino interno.
 *
 * Resolve o caso "popup do Google bloqueado / aba travada em /signup mesmo
 * com sessão ativa".
 */
export function useRedirectIfAuthenticated(to: string = "/welcome") {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      void navigate({ to, replace: true });
    }
  }, [isLoading, isAuthenticated, navigate, to]);

  return { isLoading, isAuthenticated };
}
