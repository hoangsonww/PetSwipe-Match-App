import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
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
const TOKEN_KEY = "jwt";

const saveToken = (token?: string | null) => {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchMe = useCallback(async () => {
    try {
      const res = await api.get<{ user: User }>("/users/me");
      setUser(res.data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const token =
      typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY);
    if (token) {
      fetchMe();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const login = async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password });
    const token = (res.data as any).token as string | undefined;
    if (token) saveToken(token);
    await fetchMe();
    window.location.href = "/home"; // redirect to home
  };
  const signup = async (data: {
    email: string;
    password: string;
    name?: string;
  }) => {
    const res = await api.post("/auth/signup", data);
    const token = (res.data as any).token as string | undefined;
    if (token) saveToken(token);
    await fetchMe();
  };
  const resetPassword = async (email: string) => {
    await api.post("/auth/verify-email", { email });
  };
  const logout = async () => {
    await api.post("/auth/logout");
    saveToken(null);
    setUser(null);
    window.location.href = "/login"; // redirect to login
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, signup, resetPassword, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
