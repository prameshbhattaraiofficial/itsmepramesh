import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { adminApi } from '@/src/services/api/adminApi';
import { clearStoredTokens, getStoredTokens, setStoredTokens } from '@/src/services/api/httpClient';
import type { AuthTokensDto } from '@/src/types/portfolio';

interface AuthContextValue {
  user: AuthTokensDto['user'] | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthTokensDto>;
  register: (fullName: string, email: string, password: string) => Promise<AuthTokensDto>;
  updateProfile: (fullName: string) => Promise<AuthTokensDto['user']>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthTokensDto['user'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { accessToken, refreshToken } = getStoredTokens();
    if (!accessToken && !refreshToken) {
      setIsLoading(false);
      return;
    }

    adminApi
      .me()
      .then((u) => setUser(u))
      .catch(() => {
        clearStoredTokens();
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const data = await adminApi.login(email, password);
    setStoredTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    return data;
  };

  const register = async (fullName: string, email: string, password: string) => {
    const data = await adminApi.register({ fullName, email, password });
    setStoredTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    return data;
  };

  const updateProfile = async (fullName: string) => {
    const updated = await adminApi.updateUserProfile({ fullName });
    setUser(updated);
    return updated;
  };

  const logout = async () => {
    const { refreshToken } = getStoredTokens();
    try {
      await adminApi.logout(refreshToken);
    } catch {
      // Proceed with local sign-out even if token already expired
    }
    clearStoredTokens();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
