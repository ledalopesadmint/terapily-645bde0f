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
  /** True when hydration is taking unusually long (>3s) */
  isSlowLoading: boolean;
  /** Call to force retry hydration */
  retryHydration: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

/** Single query with timeout + retry */
async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs = 6000,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Query timeout")),
      timeoutMs,
    );
    fn()
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

async function withRetryBackoff<T>(
  fn: () => Promise<T>,
  retries = 2,
  delays = [300, 800],
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < retries) {
        await new Promise((r) => setTimeout(r, delays[i] ?? 1500));
      }
    }
  }
  throw lastErr;
}

/**
 * Carrega profile + roles + workspace do usuário autenticado.
 * Com retry e timeout por query. Falha em queries não-críticas não bloqueia.
 */
async function loadAuthData(userId: string): Promise<{
  profile: AuthProfile | null;
  roles: AppRole[];
  workspace: AuthWorkspace | null;
}> {
  const profilePromise = withRetryBackoff(() =>
    withTimeout(async () => {
      const r = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, locale, timezone")
        .eq("id", userId)
        .maybeSingle();
      return r.data ?? null;
    }),
  ).catch((err) => {
    console.warn("[AuthProvider] profile load failed, using fallback", err);
    return null;
  });

  const rolesPromise = withRetryBackoff(() =>
    withTimeout(async () => {
      const r = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      return (r.data ?? []).map((x) => x.role);
    }),
  ).catch((err) => {
    console.warn("[AuthProvider] roles load failed, using fallback", err);
    return [] as AppRole[];
  });

  const workspacePromise = withRetryBackoff(() =>
    withTimeout(async () => {
      const r = await supabase
        .from("workspace_members")
        .select("role, workspace:workspaces(id, name, slug, trial_ends_at)")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!r.data?.workspace) return null;
      const ws = r.data.workspace as {
        id: string;
        name: string;
        slug: string;
        trial_ends_at: string;
      };
      return {
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        trial_ends_at: ws.trial_ends_at,
        role: r.data.role,
      } as AuthWorkspace;
    }),
  ).catch((err) => {
    console.warn("[AuthProvider] workspace load failed, using fallback", err);
    return null;
  });

  const [profile, roles, workspace] = await Promise.all([
    profilePromise,
    rolesPromise,
    workspacePromise,
  ]);

  return { profile, roles, workspace };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [workspace, setWorkspace] = useState<AuthWorkspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSlowLoading, setIsSlowLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const lastSigninUserId = useRef<string | null>(null);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const retryHydration = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  useEffect(() => {
    // Start slow-loading timer
    slowTimerRef.current = setTimeout(() => setIsSlowLoading(true), 3000);

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        if (newSession?.user) {
          const userId = newSession.user.id;
          setTimeout(() => {
            void hydrate(newSession);
            if (
              event === "SIGNED_IN" &&
              lastSigninUserId.current !== userId
            ) {
              lastSigninUserId.current = userId;
              void recordAuthEvent({ data: { action: "auth.signin" } }).catch(
                () => {},
              );
            }
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setWorkspace(null);
          lastSigninUserId.current = null;
        }
      },
    );

    void supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) {
        lastSigninUserId.current = data.session.user.id;
        await hydrate(data.session);
      }
      setIsLoading(false);
      setIsSlowLoading(false);
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    });

    return () => {
      subscription.subscription.unsubscribe();
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    };
  }, [hydrate, retryCount]);

  const signOut = useCallback(async () => {
    await recordAuthEvent({ data: { action: "auth.signout" } }).catch(() => {});
    lastSigninUserId.current = null;
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
      isSlowLoading,
      retryHydration,
    }),
    [isLoading, session, profile, roles, workspace, signOut, refresh, hasRole, isSlowLoading, retryHydration],
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
