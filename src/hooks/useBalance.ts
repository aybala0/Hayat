import { useState, useCallback } from "react";
import { api } from "../api";
import type { Balance } from "../types";

export function useBalance() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const b = await api.getBalance();
      setBalance(b);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load balance.");
    } finally {
      setLoading(false);
    }
  }, []);

  return { balance, loading, error, refresh };
}
