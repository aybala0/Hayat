import { useState } from "react";
import type { Expense, User } from "../types";
import { TagFilter } from "./TagFilter";

type Props = {
  expenses: Expense[];
  loading: boolean;
  error: string | null;
  user: User;
};

function formatAmount(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00"); // avoid timezone shift
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ExpenseList({ expenses, loading, error, user }: Props) {
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const filtered = tagFilter
    ? expenses.filter((e) => e.tag === tagFilter)
    : expenses;

  return (
    <div>
      <div className="mb-3">
        <TagFilter selected={tagFilter} onChange={setTagFilter} />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-3">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-100 px-4 py-3 animate-pulse"
            >
              <div className="h-4 bg-gray-100 rounded w-2/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-400 text-sm py-12">
          {tagFilter ? "No expenses in this category." : "No expenses yet."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((expense, i) => (
            <ExpenseRow key={i} expense={expense} user={user} />
          ))}
        </div>
      )}
    </div>
  );
}

function ExpenseRow({ expense }: { expense: Expense; user: User }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="font-medium text-gray-900 truncate">{expense.description}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-400">{formatDate(expense.date)}</span>
          <span className="text-xs text-gray-300">·</span>
          <span className="text-xs bg-gray-50 border border-gray-100 text-gray-500 rounded-full px-2 py-0.5 whitespace-nowrap">
            {expense.tag}
          </span>
        </div>
      </div>
      <div className="text-right flex-none">
        <p className="font-semibold text-gray-900">{formatAmount(expense.amount)}</p>
        <p className="text-xs text-gray-400">{expense.paidBy} paid</p>
      </div>
    </div>
  );
}
