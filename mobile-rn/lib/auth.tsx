import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestOtp as apiRequestOtp, verifyOtp as apiVerifyOtp, setAuthToken } from './api';

const TOKEN_KEY = 'app_token';

type AuthContextType = {
  token: string | null;
  isLoading: boolean;
  login: (phone: string, otp: string) => Promise<void>;
  requestOtp: (phone: string) => Promise<string | undefined>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(TOKEN_KEY).then((t) => {
      if (t) {
        setAuthToken(t);
        setToken(t);
      }
      setIsLoading(false);
    });
  }, []);

  const requestOtp = useCallback(async (phone: string) => {
    const res = await apiRequestOtp(phone);
    return res.devOtp;
  }, []);

  const login = useCallback(async (phone: string, otp: string) => {
    const { accessToken } = await apiVerifyOtp(phone, otp);
    await AsyncStorage.setItem(TOKEN_KEY, accessToken);
    setAuthToken(accessToken);
    setToken(accessToken);
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setAuthToken(null);
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, isLoading, login, requestOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
