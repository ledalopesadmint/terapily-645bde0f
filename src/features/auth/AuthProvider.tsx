import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { recordAuthEvent } from "@/features/auth/auth-events.functions";

type AppRole = Database["public"]["Enums"]["app_role"];
type WorkspaceRole = Database["public"]["Enums"]["workspace_role"];

export interface AuthProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  locale: string;
  timezone: string;
}

export interface AuthWorkspace {
  id: string;
  name: string;
  slug: string;
  role: WorkspaceRole;
  trial_ends_at: string;
}

export interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  session: Session | null;
  user: User | null;
  profile: AuthProfile | null;
  roles: AppRole[];
  workspace: AuthWorkspace | null;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

/**
 * Carrega profile + roles + workspace do usuário autenticado.
 * Tudo em queries paralelas, scoped via RLS.
 */
async function loadAuthData(userId: string): Promise<{
  profile: AuthProfile | null;
  roles: AppRole[];
  workspace: AuthWorkspace | null;
}> {
  const [profileRes, rolesRes, membershipRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url, locale, timezone")
      .eq("id", userId)
      .maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase
      .from("workspace_members")
      .select("role, workspace:workspaces(id, name, slug, trial_ends_at)")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const profile = profileRes.data ?? null;
  const roles = (rolesRes.data ?? []).map((r) => r.role);

  let workspace: AuthWorkspace | null = null;
  if (membershipRes.data?.workspace) {
    const ws = membershipRes.data.workspace as {
      id: string;
      name: string;
      slug: string;
      trial_ends_at: string;
    };
    workspace = {
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      trial_ends_at: ws.trial_ends_at,
      role: membershipRes.data.role,
    };
  }

  return { profile, roles, workspace };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [workspace, setWorkspace] = useState<AuthWorkspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const hydrate = useCallback(async (s: Session | null) => {
    if (!s?.user) {
      setProfile(null);
      setRoles([]);
      setWorkspace(null);
      return;
    }
    const data = await loadAuthData(s.user.id);
    setProfile(data.profile);
    setRoles(data.roles);
    setWorkspace(data.workspace);
  }, []);

  useEffect(() => {
    // CRITICAL: subscribe ANTES de getSession (knowledge: adding-login-logout)
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        // Defer chamadas ao Supabase pra fora do callback (evita deadlock)
        if (newSession?.user) {
          setTimeout(() => {
            void hydrate(newSession);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setWorkspace(null);
        }
      },
    );

    void supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) {
        await hydrate(data.session);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, [hydrate]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const refresh = useCallback(async () => {
    await hydrate(session);
  }, [hydrate, session]);

  const hasRole = useCallback(
    (role: AppRole) => roles.includes(role),
    [roles],
  );

  const value = useMemo<AuthState>(
    () => ({
      isLoading,
      isAuthenticated: !!session?.user,
      session,
      user: session?.user ?? null,
      profile,
      roles,
      workspace,
      signOut,
      refresh,
      hasRole,
    }),
    [isLoading, session, profile, roles, workspace, signOut, refresh, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
