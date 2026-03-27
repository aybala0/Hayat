import { useEffect, useState, useRef } from "react";
import { useAuth } from "./hooks/useAuth";
import { useBalance } from "./hooks/useBalance";
import { useExpenses } from "./hooks/useExpenses";
import { LoginScreen } from "./components/LoginScreen";
import { BalanceHeader } from "./components/BalanceHeader";
import { AddExpenseForm } from "./components/AddExpenseForm";
import { ExpenseList } from "./components/ExpenseList";
import { EditExpenseForm } from "./components/EditExpenseForm";
import { api } from "./api";

const PULL_THRESHOLD = 72;

export default function App() {
  const { user, loading: authLoading, logout, forceLogout } = useAuth();

  const handle401 = (err: unknown) => {
    if (err && typeof err === "object" && (err as { status?: number }).status === 401) {
      forceLogout();
    }
  };
  const { balance, loading: balanceLoading, refresh: refreshBalance } = useBalance();
  const { expenses, loading: expensesLoading, error: expensesError, refresh: refreshExpenses } = useExpenses();
  const [showForm, setShowForm] = useState(false);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef(0);
  const pullingRef = useRef(false);

  useEffect(() => {
    if (user) {
      Promise.all([refreshBalance(), refreshExpenses()]).catch(handle401);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startYRef.current = e.touches[0].clientY;
      pullingRef.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!pullingRef.current || refreshing) return;
    const dy = e.touches[0].clientY - startYRef.current;
    if (dy > 0) {
      setPullY(Math.min(dy * 0.5, PULL_THRESHOLD));
    }
  };

  const handleTouchEnd = async () => {
    if (!pullingRef.current) return;
    pullingRef.current = false;

    if (pullY >= PULL_THRESHOLD) {
      setRefreshing(true);
      setPullY(0);
      await Promise.all([refreshBalance(), refreshExpenses()]).catch(handle401);
      setRefreshing(false);
    } else {
      setPullY(0);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  const handleExpenseAdded = () => {
    refreshBalance();
    refreshExpenses();
  };

  const handleDelete = async (rowIndex: number) => {
    await api.deleteExpense(rowIndex);
    refreshBalance();
    refreshExpenses();
  };

  const indicatorSize = refreshing ? PULL_THRESHOLD : pullY;

  return (
    <div
      className="max-w-lg mx-auto min-h-screen bg-gray-50 relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{ height: indicatorSize }}
      >
        {(pullY > 10 || refreshing) && (
          <div
            className={`w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full ${refreshing ? "animate-spin" : ""}`}
            style={{ opacity: refreshing ? 1 : pullY / PULL_THRESHOLD }}
          />
        )}
      </div>

      <BalanceHeader
        user={user}
        balance={balance}
        loading={balanceLoading}
        onLogout={logout}
      />

      <div className="px-4 py-4 pb-24">
        <ExpenseList
          expenses={expenses}
          loading={expensesLoading}
          error={expensesError}
          user={user}
          onDelete={handleDelete}
          onEdit={(rowIndex) => setEditingRow(rowIndex)}
        />
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 active:bg-indigo-800 transition-colors z-10"
        aria-label="Add expense"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {showForm && (
        <AddExpenseForm
          user={user}
          onSuccess={handleExpenseAdded}
          onClose={() => setShowForm(false)}
        />
      )}

      {editingRow !== null && expenses[editingRow] && (
        <EditExpenseForm
          user={user}
          expense={expenses[editingRow]}
          rowIndex={editingRow}
          onSuccess={handleExpenseAdded}
          onClose={() => setEditingRow(null)}
        />
      )}
    </div>
  );
}
