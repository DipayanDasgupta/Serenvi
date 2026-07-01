"use client";

import Link from "next/link";
import { useWallet, useWalletTransactions } from "@/lib/hooks/use-wallet";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import { TRANSACTION_TYPE_COLORS } from "@/lib/constants";

export default function WalletPage() {
  const { wallet, isLoading: walletLoading } = useWallet();
  const { data: transactions, isLoading: txLoading } = useWalletTransactions(0, 10);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Wallet</h1>
        <p className="mt-1 text-muted">Manage your funds and view transactions.</p>
      </div>

      {/* Balance Card */}
      {walletLoading ? (
        <Skeleton className="h-48 w-full rounded-2xl" />
      ) : (
        <div className="glass rounded-2xl p-8 bg-gradient-to-br from-accent/5 to-accent-2/5">
          <p className="text-sm font-medium text-muted mb-2">Available Balance</p>
          <p className="text-4xl font-bold text-foreground mb-6">
            {formatCurrency(wallet?.balance || 0)}
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted">Total Earnings</p>
              <p className="text-lg font-semibold text-success">
                {formatCurrency(wallet?.totalEarnings || 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">Total Withdrawals</p>
              <p className="text-lg font-semibold text-foreground">
                {formatCurrency(wallet?.totalWithdrawals || 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">Pending Withdrawals</p>
              <p className="text-lg font-semibold text-warning">
                {formatCurrency(wallet?.pendingWithdrawals || 0)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/wallet/transfer" className="block">
          <div className="glass rounded-2xl p-5 hover:bg-surface-hover transition-colors cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent group-hover:bg-accent/20 transition-colors">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <polyline points="19 12 12 19 5 12" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-foreground">Transfer</p>
                <p className="text-xs text-muted">Send to team member</p>
              </div>
            </div>
          </div>
        </Link>
        <Link href="/wallet/deposit" className="block">
          <div className="glass rounded-2xl p-5 hover:bg-surface-hover transition-colors cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10 text-success group-hover:bg-success/20 transition-colors">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-foreground">Deposit</p>
                <p className="text-xs text-muted">Add funds via UPI</p>
              </div>
            </div>
          </div>
        </Link>
        <Link href="/wallet/withdraw" className="block">
          <div className="glass rounded-2xl p-5 hover:bg-surface-hover transition-colors cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10 text-warning group-hover:bg-warning/20 transition-colors">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-foreground">Withdraw</p>
                <p className="text-xs text-muted">To bank account</p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Transactions */}
      <Card title="Recent Transactions">
        {txLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : !transactions || transactions.length === 0 ? (
          <p className="py-8 text-center text-muted">No transactions yet.</p>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-xl bg-surface-2/50 px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${TRANSACTION_TYPE_COLORS[tx.type] || "text-muted"}`}>
                      {tx.type}
                    </span>
                    <span className="text-xs text-muted">{formatRelativeTime(tx.createdAt)}</span>
                  </div>
                  <p className="text-sm text-foreground truncate mt-0.5">{tx.description}</p>
                </div>
                <span
                  className={`ml-4 text-sm font-semibold whitespace-nowrap ${
                    ["COMMISSION", "ACHIEVEMENT", "SALARY", "DEPOSIT", "REFUND"].includes(tx.type)
                      ? "text-success"
                      : "text-danger"
                  }`}
                >
                  {["COMMISSION", "ACHIEVEMENT", "SALARY", "DEPOSIT", "REFUND"].includes(tx.type) ? "+" : "-"}
                  {formatCurrency(Math.abs(tx.amount))}
                </span>
              </div>
            ))}
            <Link
              href="/wallet/transactions"
              className="block pt-3 text-center text-sm text-accent hover:text-accent/80 transition-colors"
            >
              View All Transactions
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
