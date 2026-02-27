"use client";

import { useEffect, useState } from "react";
import { PageSpinner } from "@/components/ui/Spinner";

interface WalletTransaction {
  id: string;
  type: string;
  amount: string;
  description: string;
  createdAt: string;
}

export default function WalletPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/wallet")
      .then((r) => r.json())
      .then((d) => {
        setBalance(Number(d.balance));
        setTransactions(d.transactions ?? []);
        setLoading(false);
      });
  }, []);

  if (loading) return <PageSpinner />;

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">My Wallet</h1>

      {/* Balance Card */}
      <div className="mb-6 rounded-2xl bg-blue-600 px-6 py-8 text-center text-white shadow-lg">
        <p className="mb-1 text-sm font-medium opacity-80">Available Balance</p>
        <p className="text-5xl font-bold tracking-tight">
          ₹{balance?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </p>
        <button
          disabled
          className="mt-6 w-full rounded-xl bg-white/20 py-3 text-sm font-semibold opacity-70 cursor-not-allowed"
        >
          Top Up — Coming Soon
        </button>
      </div>

      {/* Transactions */}
      <div className="rounded-2xl bg-white shadow-sm border border-gray-100">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="font-semibold text-gray-900">Transaction History</h2>
        </div>

        {transactions.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            No transactions yet.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {transactions.map((tx) => {
              const isCredit = tx.type === "CREDIT" || Number(tx.amount) > 0;
              return (
                <li key={tx.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{tx.description}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(tx.createdAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      isCredit ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {isCredit ? "+" : ""}₹{Math.abs(Number(tx.amount)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
