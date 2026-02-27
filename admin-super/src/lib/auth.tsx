import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, setToken, getMe } from './api';

const TOKEN_KEY = 'admin_token';

type AuthContextType = {
  token: string | null;
  user: { email: string; fullName: string; role: string; orgId?: string } | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isSuperAdmin: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<AuthContextType['user']>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (t) {
      setToken(t);
      setTokenState(t);
      getMe(t)
        .then((me) => setUser({ ...me, orgId: me.orgId ?? undefined }))
        .catch(() => {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setTokenState(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiLogin(email, password);
    const t = data.accessToken;
    localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
    setTokenState(t);
    setUser({
      email: data.email,
      fullName: data.fullName || '',
      role: data.role || '',
      orgId: data.orgId ?? undefined,
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setTokenState(null);
    setUser(null);
  }, []);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isLoading, isSuperAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
