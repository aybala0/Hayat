import type { User, Balance } from "../types";

type Props = {
  user: User;
  balance: Balance | null;
  loading: boolean;
  onLogout: () => void;
};

function formatAmount(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

export function BalanceHeader({ user, balance, loading, onLogout }: Props) {
  return (
    <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-5 sticky top-0 z-10">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <span className="font-bold text-lg" style={{ color: "#008200" }}>Hayat</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{user.name}</span>
          <button
            onClick={onLogout}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Balance */}
      {loading || !balance ? (
        <div className="h-14 flex items-center">
          <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
        </div>
      ) : balance.direction === "square" ? (
        <div>
          <p className="text-sm text-gray-400 mb-0.5">All settled up</p>
          <p className="text-3xl font-bold text-gray-900">You're square</p>
        </div>
      ) : balance.direction === "owed" ? (
        <div>
          <p className="text-sm text-gray-400 mb-0.5">
            {balance.otherName} owes you
          </p>
          <p className="text-3xl font-bold text-gray-900">
            {formatAmount(balance.amount)}
          </p>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-400 mb-0.5">
            You owe {balance.otherName}
          </p>
          <p className="text-3xl font-bold text-gray-900">
            {formatAmount(balance.amount)}
          </p>
        </div>
      )}
    </div>
  );
}
