import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { getDevelopmentToken } from "../api/wealthOps";
import type { UserRole } from "../types";

interface AuthContextValue {
  token: string | null;
  role: UserRole | null;
  signIn: (role: UserRole) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const TOKEN_KEY = "wealthops.access-token";
const ROLE_KEY = "wealthops.role";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY));
  const [role, setRole] = useState<UserRole | null>(() => sessionStorage.getItem(ROLE_KEY) as UserRole | null);

  const signIn = useCallback(async (nextRole: UserRole) => {
    const result = await getDevelopmentToken(nextRole);
    sessionStorage.setItem(TOKEN_KEY, result.accessToken);
    sessionStorage.setItem(ROLE_KEY, result.role);
    setToken(result.accessToken);
    setRole(result.role);
  }, []);

  const signOut = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(ROLE_KEY);
    setToken(null);
    setRole(null);
  }, []);

  const value = useMemo(() => ({ token, role, signIn, signOut }), [token, role, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
