import { useState, useEffect } from "react";
import { api } from "../api";
import type { User } from "../types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // Call this when any API call returns 401 (e.g. expired Google token)
  const forceLogout = () => setUser(null);

  const logout = async () => {
    await api.logout().catch(() => null);
    setUser(null);
  };

  return { user, loading, logout, forceLogout };
}
