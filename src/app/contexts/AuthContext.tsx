import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { apiRequest } from "@/lib/api";

export type UserRole = "intern" | "supervisor" | "admin";
const TOKEN_STORAGE_KEY = "ims_auth_token";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  birthdate?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthResponse {
  token: string;
  user: User;
}

function getStoredToken() {
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

function storeToken(token: string) {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

function clearToken() {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      const token = getStoredToken();

      if (!token) {
        if (mounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const data = await apiRequest<{ user: User }>("/auth/me", {
          method: "GET",
          token,
        });

        if (mounted) {
          setUser(data.user);
        }
      } catch (_error) {
        clearToken();
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const data = await apiRequest<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      storeToken(data.token);
      setUser(data.user);
      return true;
    } catch (_error) {
      clearToken();
      setUser(null);
      return false;
    }
  };

  const logout = async () => {
    const token = getStoredToken();
    if (token) {
      try {
        await apiRequest("/auth/logout", {
          method: "POST",
          token,
        });
      } catch (_error) {
      }
    }

    clearToken();
    setUser(null);
  };

  const updateUser = (nextUser: User) => {
    setUser(nextUser);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      updateUser,
      isAuthenticated: !!user,
      isLoading,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
