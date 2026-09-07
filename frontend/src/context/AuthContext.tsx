import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfileResponse, LoginRequest } from '../types';
import { loginApi, logoutApi, getMeApi } from '../services/authApi';

interface AuthContextType {
  user: UserProfileResponse | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<UserProfileResponse>;
  logout: () => Promise<void>;
}

const TOKEN_KEY = 'cyberscope_token';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfileResponse | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validate existing token on mount or token change
  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        if (isMounted) {
          setUser(null);
          setToken(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const profile = await getMeApi(storedToken);
        if (isMounted) {
          setUser(profile);
          setToken(storedToken);
        }
      } catch (err) {
        console.warn('Session restoration failed:', err);
        localStorage.removeItem(TOKEN_KEY);
        if (isMounted) {
          setUser(null);
          setToken(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (credentials: LoginRequest): Promise<UserProfileResponse> => {
    setIsLoading(true);
    try {
      const data = await loginApi(credentials);
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    const currentToken = localStorage.getItem(TOKEN_KEY) || token;
    if (currentToken) {
      await logoutApi(currentToken);
    }
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setToken(null);
    setIsLoading(false);
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
