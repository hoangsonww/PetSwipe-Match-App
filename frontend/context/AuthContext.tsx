import React, { createContext, useState, useEffect, ReactNode } from "react";
import { api } from "@/lib/api";

export type User = {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: {
    email: string;
    password: string;
    name?: string;
  }) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({} as any);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // load current user on mount
  const fetchMe = async () => {
    try {
      const res = await api.get<{ user: User }>("/users/me");
      setUser(res.data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  const login = async (email: string, password: string) => {
    await api.post("/auth/login", { email, password });
    await fetchMe();
  };

  const signup = async (data: {
    email: string;
    password: string;
    name?: string;
  }) => {
    await api.post("/auth/signup", data);
    await fetchMe();
  };

  const resetPassword = async (email: string) => {
    await api.post("/auth/verify-email", { email });
  };

  const logout = async () => {
    await api.post("/auth/logout");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, signup, resetPassword, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
