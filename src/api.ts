import type { User, Expense, Balance } from "./types";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    credentials: "include",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  getMe: () => apiFetch<User>("/api/auth/me"),

  logout: () =>
    apiFetch<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),

  getExpenses: () => apiFetch<Expense[]>("/api/expenses"),

  addExpense: (data: Omit<Expense, "date">) =>
    apiFetch<Expense>("/api/expenses", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getBalance: () => apiFetch<Balance>("/api/balance"),

  updateExpense: (rowIndex: number, data: Omit<Expense, "date">) =>
    apiFetch<Expense>(`/api/expenses?rowIndex=${rowIndex}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteExpense: (rowIndex: number) =>
    apiFetch<{ ok: boolean }>(`/api/expenses?rowIndex=${rowIndex}`, {
      method: "DELETE",
    }),
};
