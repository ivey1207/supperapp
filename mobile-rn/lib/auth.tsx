import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestOtp as apiRequestOtp, verifyOtp as apiVerifyOtp, loginWithPassword as apiLoginWithPassword, setAuthToken } from './api';

const TOKEN_KEY = 'app_token';

type AuthContextType = {
  token: string | null;
  user: any | null;
  setUser: (user: any) => void;
  isLoading: boolean;
  login: (phone: string, otp: string) => Promise<{ isNewUser: boolean }>;
  loginWithPassword: (identifier: string, password: string) => Promise<void>;
  requestOtp: (phone: string, email: string) => Promise<void>;
  register: (payload: { fullName: string; phone: string; email: string; password?: string }) => Promise<void>;
  confirmRegistration: (phone: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(TOKEN_KEY).then(async (t) => {
      if (t) {
        setAuthToken(t);
        setToken(t);
        try {
          const { getMe } = await import('./api');
          const userData = await getMe(t);
          setUser(userData);
        } catch (e) {
          console.error('Failed to hydrate user:', e);
        }
      }
      setIsLoading(false);
    });
  }, []);

  const requestOtp = useCallback(async (phone: string, email: string) => {
    await apiRequestOtp(phone, email);
  }, []);

  const register = useCallback(async (payload: { fullName: string; phone: string; email: string; password?: string }) => {
    const { register: apiRegister } = await import('./api');
    await apiRegister(payload);
  }, []);

  const login = useCallback(async (phone: string, otp: string) => {
    const { accessToken, isNewUser } = await apiVerifyOtp(phone, otp);
    if (!isNewUser) {
      await AsyncStorage.setItem(TOKEN_KEY, accessToken);
      setAuthToken(accessToken);
      setToken(accessToken);
      const { getMe } = await import('./api');
      const userData = await getMe(accessToken);
      setUser(userData);
    }
    return { isNewUser };
  }, []);

  const confirmRegistration = useCallback(async (phone: string, otp: string) => {
    const { verifyRegistration } = await import('./api');
    const { accessToken, user: userData } = await verifyRegistration(phone, otp);
    await AsyncStorage.setItem(TOKEN_KEY, accessToken);
    setAuthToken(accessToken);
    setToken(accessToken);
    setUser(userData);
  }, []);

  const loginWithPassword = useCallback(async (identifier: string, password: string) => {
    const { accessToken, user: userData } = await apiLoginWithPassword(identifier, password);
    await AsyncStorage.setItem(TOKEN_KEY, accessToken);
    setAuthToken(accessToken);
    setToken(accessToken);
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setAuthToken(null);
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, setUser, isLoading, login, loginWithPassword, requestOtp, register, confirmRegistration, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
