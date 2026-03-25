import { useState } from "react";
import type { User, Expense, SplitOption } from "../types";
import { TAGS, getOtherName, isUserA } from "../config";
import { SplitOptions } from "./SplitOptions";
import { api } from "../api";

type Props = {
  user: User;
  expense: Expense;
  rowIndex: number;
  onSuccess: () => void;
  onClose: () => void;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function computeShares(
  splitOption: SplitOption,
  amount: number,
  myName: string,
  otherName: string,
  isAybala: boolean,
  myPercent: number,
  customPaidBy: "me" | "them"
): { paidBy: string; aylasShare: number; erdemsShare: number } {
  switch (splitOption) {
    case "50/50-me":
      return { paidBy: myName, aylasShare: round2(amount / 2), erdemsShare: round2(amount / 2) };
    case "50/50-them":
      return { paidBy: otherName, aylasShare: round2(amount / 2), erdemsShare: round2(amount / 2) };
    case "full-me":
      return { paidBy: myName, aylasShare: isAybala ? 0 : amount, erdemsShare: isAybala ? amount : 0 };
    case "full-them":
      return { paidBy: otherName, aylasShare: isAybala ? amount : 0, erdemsShare: isAybala ? 0 : amount };
    case "custom": {
      const myShare = round2(amount * (myPercent / 100));
      const theirShare = round2(amount - myShare);
      return {
        paidBy: customPaidBy === "me" ? myName : otherName,
        aylasShare: isAybala ? myShare : theirShare,
        erdemsShare: isAybala ? theirShare : myShare,
      };
    }
  }
}

function detectInitialState(
  expense: Expense,
  myName: string,
  isAybala: boolean
): { splitOption: SplitOption; myPercent: string; customPaidBy: "me" | "them" } {
  const myShare = isAybala ? expense.aylasShare : expense.erdemsShare;
  const theirShare = isAybala ? expense.erdemsShare : expense.aylasShare;
  const iPaid = expense.paidBy === myName;
  const half = expense.amount / 2;

  if (Math.abs(expense.aylasShare - half) < 0.02 && Math.abs(expense.erdemsShare - half) < 0.02) {
    return { splitOption: iPaid ? "50/50-me" : "50/50-them", myPercent: "50", customPaidBy: "me" };
  }
  if (myShare < 0.02 && iPaid) {
    return { splitOption: "full-me", myPercent: "0", customPaidBy: "me" };
  }
  if (theirShare < 0.02 && !iPaid) {
    return { splitOption: "full-them", myPercent: "100", customPaidBy: "them" };
  }
  const myPct = expense.amount > 0 ? Math.round((myShare / expense.amount) * 100) : 50;
  return { splitOption: "custom", myPercent: String(myPct), customPaidBy: iPaid ? "me" : "them" };
}

export function EditExpenseForm({ user, expense, rowIndex, onSuccess, onClose }: Props) {
  const myName = user.name;
  const otherName = getOtherName(user.email);
  const isAybala = isUserA(user.email);

  const initial = detectInitialState(expense, myName, isAybala);

  const [description, setDescription] = useState(expense.description);
  const [tag, setTag] = useState(expense.tag);
  const [amount, setAmount] = useState(String(expense.amount));
  const [splitOption, setSplitOption] = useState<SplitOption>(initial.splitOption);
  const [myPercent, setMyPercent] = useState(initial.myPercent);
  const [customPaidBy, setCustomPaidBy] = useState<"me" | "them">(initial.customPaidBy);
  const [notes, setNotes] = useState(expense.notes);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const otherPercent = Math.max(0, 100 - (parseFloat(myPercent) || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (!description.trim()) return setError("Please enter a description.");
    if (isNaN(parsedAmount) || parsedAmount <= 0) return setError("Please enter a valid amount.");
    if (splitOption === "custom") {
      const p = parseFloat(myPercent);
      if (isNaN(p) || p < 0 || p > 100)
        return setError("Custom percentage must be between 0 and 100.");
    }

    const { paidBy, aylasShare, erdemsShare } = computeShares(
      splitOption, parsedAmount, myName, otherName, isAybala,
      parseFloat(myPercent) || 0, customPaidBy
    );

    setSubmitting(true);
    try {
      await api.updateExpense(rowIndex, {
        description: description.trim(),
        tag,
        amount: parsedAmount,
        paidBy,
        aylasShare,
        erdemsShare,
        notes: notes.trim(),
      });
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  // Ensure the tag value exists in current TAGS list, otherwise keep as-is
  const tagOptions = TAGS.map((t) => `${t.emoji} ${t.label}`);
  const tagValue = tagOptions.includes(tag) ? tag : tag;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-20" onClick={onClose} />

      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white rounded-t-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 pt-5 pb-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-900">Edit Expense</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 -mr-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                <select
                  value={tagValue}
                  onChange={(e) => setTag(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  {TAGS.map((t) => {
                    const value = `${t.emoji} ${t.label}`;
                    return <option key={value} value={value}>{value}</option>;
                  })}
                </select>
              </div>
              <div className="w-32">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl pl-7 pr-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">How to split</label>
              <SplitOptions
                myName={myName}
                otherName={otherName}
                selected={splitOption}
                onSelect={setSplitOption}
              />
            </div>

            {splitOption === "custom" && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-600 w-20 flex-none">Your share</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={myPercent}
                      onChange={(e) => setMyPercent(e.target.value)}
                      className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-600 w-20 flex-none">{otherName}'s</label>
                  <div className="flex items-center gap-1.5">
                    <span className="w-16 text-center text-sm font-medium text-gray-700">{otherPercent}</span>
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-600 w-20 flex-none">Who paid</label>
                  <div className="flex rounded-lg overflow-hidden border border-gray-200">
                    <button
                      type="button"
                      onClick={() => setCustomPaidBy("me")}
                      className={`px-3 py-1.5 text-sm transition-colors ${customPaidBy === "me" ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                    >
                      Me
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomPaidBy("them")}
                      className={`px-3 py-1.5 text-sm transition-colors border-l border-gray-200 ${customPaidBy === "them" ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                    >
                      {otherName}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Notes <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any extra details…"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 text-white rounded-xl py-3 font-medium text-sm hover:bg-indigo-700 active:bg-indigo-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Saving…" : "Save Changes"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

