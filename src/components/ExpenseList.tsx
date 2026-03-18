import { useState, useRef } from "react";
import type { Expense, User } from "../types";
import { TagFilter } from "./TagFilter";

type Props = {
  expenses: Expense[];
  loading: boolean;
  error: string | null;
  user: User;
  onDelete: (rowIndex: number) => void;
};

function formatAmount(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ExpenseList({ expenses, loading, error, onDelete }: Props) {
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const filtered = tagFilter
    ? expenses.filter((e) => e.tag === tagFilter)
    : expenses;

  // When tag filter is active, map filtered rows back to original indices for delete
  const getOriginalIndex = (filteredIndex: number) => {
    if (!tagFilter) return filteredIndex;
    const item = filtered[filteredIndex];
    return expenses.indexOf(item);
  };

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
            <ExpenseRow
              key={`${expense.date}-${expense.description}-${i}`}
              expense={expense}
              onDelete={() => onDelete(getOriginalIndex(i))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const DELETE_WIDTH = 72;
const REVEAL_THRESHOLD = 40;

function ExpenseRow({
  expense,
  onDelete,
}: {
  expense: Expense;
  onDelete: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const offsetRef = useRef(0);
  const revealedRef = useRef(false);

  const applyTransform = (offset: number, animate: boolean) => {
    const el = contentRef.current;
    if (!el) return;
    el.style.transition = animate ? "transform 0.2s ease" : "none";
    el.style.transform = `translateX(${offset}px)`;
    offsetRef.current = offset;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    const el = contentRef.current;
    if (el) el.style.transition = "none";
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startXRef.current;
    const base = revealedRef.current ? -DELETE_WIDTH : 0;
    const next = Math.max(Math.min(base + dx, 0), -DELETE_WIDTH);
    applyTransform(next, false);
  };

  const handleTouchEnd = () => {
    if (offsetRef.current < -REVEAL_THRESHOLD) {
      applyTransform(-DELETE_WIDTH, true);
      revealedRef.current = true;
    } else {
      applyTransform(0, true);
      revealedRef.current = false;
    }
  };

  return (
    <div className="relative rounded-xl overflow-hidden">
      {/* Red delete button revealed on swipe */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-500 rounded-r-xl"
        style={{ width: DELETE_WIDTH }}
      >
        <button
          onClick={onDelete}
          className="w-full h-full flex items-center justify-center"
          aria-label="Delete expense"
        >
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>

      {/* Row content — slides left on swipe */}
      <div
        ref={contentRef}
        className="relative bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
        style={{ touchAction: "pan-y" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
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
    </div>
  );
}
