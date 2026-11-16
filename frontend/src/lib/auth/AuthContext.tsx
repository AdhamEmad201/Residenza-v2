'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, ApiError, ensureCsrfCookie } from '@/lib/api/client';
import type { LoginPayload, RegisterPayload, User } from '@/types/api';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const response = await api.get<User>('/auth/me');
      const currentUser = response.data ?? null;
      setUser(currentUser);
      return currentUser;
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        setUser(null);
        return null;
      }
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (payload: LoginPayload): Promise<User> => {
    await ensureCsrfCookie();
    const response = await api.post<User>('/auth/login', payload);
    if (!response.data) {
      throw new ApiError('لم يتم استلام بيانات المستخدم من الخادم', 500, 'EMPTY_USER_DATA');
    }
    setUser(response.data);
    return response.data;
  }, []);

  const register = useCallback(async (payload: RegisterPayload): Promise<User> => {
    await ensureCsrfCookie();
    const response = await api.post<User>('/auth/register', payload);
    if (!response.data) {
      throw new ApiError('لم يتم استلام بيانات المستخدم بعد التسجيل', 500, 'EMPTY_USER_DATA');
    }
    setUser(response.data);
    return response.data;
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await api.post<null>('/auth/logout');
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
