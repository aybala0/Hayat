import { useEffect, useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { useBalance } from "./hooks/useBalance";
import { useExpenses } from "./hooks/useExpenses";
import { LoginScreen } from "./components/LoginScreen";
import { BalanceHeader } from "./components/BalanceHeader";
import { AddExpenseForm } from "./components/AddExpenseForm";
import { ExpenseList } from "./components/ExpenseList";
import { api } from "./api";

export default function App() {
  const { user, loading: authLoading, logout } = useAuth();
  const { balance, loading: balanceLoading, refresh: refreshBalance } = useBalance();
  const { expenses, loading: expensesLoading, error: expensesError, refresh: refreshExpenses } = useExpenses();
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (user) {
      refreshBalance();
      refreshExpenses();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

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

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-gray-50 relative">
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

      {/* Add expense bottom sheet */}
      {showForm && (
        <AddExpenseForm
          user={user}
          onSuccess={handleExpenseAdded}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
