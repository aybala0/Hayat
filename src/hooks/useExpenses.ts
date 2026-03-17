import { useState, useCallback } from "react";
import { api } from "../api";
import type { Expense } from "../types";

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getExpenses();
      setExpenses([...data].reverse()); // newest first
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load expenses.");
    } finally {
      setLoading(false);
    }
  }, []);

  return { expenses, loading, error, refresh };
}
