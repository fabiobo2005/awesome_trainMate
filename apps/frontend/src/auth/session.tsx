import { type ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest, extractErrorMessage } from "../api/client";
import type { AuthUser, LoginResponse } from "../types/domain";

type Session = {
  accessToken: string;
  user: AuthUser;
};

type AuthSessionContextValue = {
  session: Session | null;
  isLoading: boolean;
  errorMessage: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  updateUser: (user: AuthUser) => void;
};

const STORAGE_KEY = "trainmate.auth.v1";

const AuthSessionContext = createContext<AuthSessionContextValue | undefined>(undefined);

function readStoredSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (!parsed?.accessToken || !parsed?.user?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persistSession(session: Session | null): void {
  try {
    if (!session) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // localStorage can be unavailable in some browser contexts.
  }
}

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => readStoredSession());
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const activeSession = readStoredSession();
    if (!activeSession?.accessToken) return;

    let cancelled = false;
    setIsLoading(true);
    void apiRequest<AuthUser>("/api/auth/me", {
      token: activeSession.accessToken
    })
      .then((user) => {
        if (cancelled) return;
        const refreshedSession: Session = {
          accessToken: activeSession.accessToken,
          user
        };
        setSession(refreshedSession);
        persistSession(refreshedSession);
      })
      .catch(() => {
        if (cancelled) return;
        setSession(null);
        persistSession(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function login(email: string, password: string): Promise<void> {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await apiRequest<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: {
          email,
          password,
          provider: "LOCAL"
        }
      });

      const nextSession: Session = {
        accessToken: response.accessToken,
        user: response.user
      };
      setSession(nextSession);
      persistSession(nextSession);
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, "Falha ao autenticar."));
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  function logout(): void {
    setSession(null);
    setErrorMessage(null);
    persistSession(null);
  }

  function clearError(): void {
    setErrorMessage(null);
  }

  function updateUser(user: AuthUser): void {
    setSession((current) => {
      if (!current) return current;
      const next = { ...current, user };
      persistSession(next);
      return next;
    });
  }

  const contextValue = useMemo<AuthSessionContextValue>(
    () => ({
      session,
      isLoading,
      errorMessage,
      login,
      logout,
      clearError,
      updateUser
    }),
    [session, isLoading, errorMessage]
  );

  return <AuthSessionContext.Provider value={contextValue}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession(): AuthSessionContextValue {
  const context = useContext(AuthSessionContext);
  if (!context) throw new Error("useAuthSession must be used inside AuthSessionProvider.");
  return context;
}
