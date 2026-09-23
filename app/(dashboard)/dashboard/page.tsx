"use client";

import Link from "next/link";
import { useAPI } from "@/lib/hooks/use-api";
import { useMyDistributor } from "@/lib/hooks/use-distributor";
import { useWalletTransactions } from "@/lib/hooks/use-wallet";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import type { WalletTransaction } from "@/lib/types";

interface DashboardStats {
  totalSales: number;
  walletBalance: number;
  monthlySales: number;
  rank: string;
  downlineCount: number;
  nextRank: { rank: string; progress: number } | null;
}

const txVariant = (type: WalletTransaction["type"]) => {
  switch (type) {
    case "COMMISSION":
    case "DEPOSIT":
      return "success" as const;
    case "PURCHASE":
    case "WITHDRAWAL":
      return "danger" as const;
    case "ACHIEVEMENT":
      return "warning" as const;
    default:
      return "info" as const;
  }
};

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function DashboardPage() {
  const { data: me } = useMyDistributor();
  const { data: stats, isLoading } = useAPI<DashboardStats>(
    me?.id ? `/distributors/${me.id}/dashboard` : null
  );
  const { data: activity } = useWalletTransactions(0, 5);

  const totalSales = num(stats?.totalSales);
  const walletBalance = num(stats?.walletBalance);
  const monthlySales = num(stats?.monthlySales);
  const teamSize = num(stats?.downlineCount);
  const rank = stats?.rank || "Starter";
  const nextRank = stats?.nextRank;

  const transactions: WalletTransaction[] = Array.isArray(activity) ? activity : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back{me?.name ? `, ${me.name.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-1 text-muted">
          Here&apos;s an overview of your business performance.
        </p>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Sales"
            value={formatCurrency(totalSales)}
            change={monthlySales > 0 ? `+${formatCurrency(monthlySales)} this month` : "No sales yet"}
            trend={monthlySales > 0 ? "up" : undefined}
            icon={
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
            }
          />
          <StatCard
            title="Team Size"
            value={String(teamSize)}
            change={teamSize > 0 ? `${teamSize} member${teamSize === 1 ? "" : "s"}` : "Invite to grow"}
            icon={
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87" />
                <path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
            }
          />
          <StatCard
            title="Wallet Balance"
            value={formatCurrency(walletBalance)}
            change={walletBalance > 0 ? "Available to use" : "No balance yet"}
            icon={
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
            }
          />
          <StatCard
            title="Current Rank"
            value={rank}
            change={nextRank ? `Next: ${nextRank.rank} (${num(nextRank.progress)}%)` : "Top rank achieved"}
            icon={
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 010-5H6" />
                <path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
                <path d="M18 2H6v7a6 6 0 1012 0V2z" />
              </svg>
            }
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card title="Recent Activity" className="lg:col-span-2">
          {transactions.length === 0 ? (
            <EmptyState
              icon={
                <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              }
              title="No activity yet"
              description="Your commissions, purchases and rewards will show up here."
            />
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-xl bg-surface-2/50 px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={txVariant(tx.type)}>{tx.type}</Badge>
                      <span className="text-xs text-muted">
                        {formatRelativeTime(tx.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-foreground truncate">
                      {tx.description}
                    </p>
                  </div>
                  <span
                    className={`ml-4 text-sm font-semibold ${
                      num(tx.amount) >= 0 ? "text-success" : "text-danger"
                    }`}
                  >
                    {num(tx.amount) >= 0 ? "+" : ""}
                    {formatCurrency(Math.abs(num(tx.amount)))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick Actions */}
        <Card title="Quick Actions">
          <div className="space-y-3">
            <Link href="/products" className="block">
              <Button variant="primary" className="w-full">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 01-8 0" />
                </svg>
                Shop Now
              </Button>
            </Link>
            <Link href="/wallet/transfer" className="block">
              <Button variant="secondary" className="w-full">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <polyline points="19 12 12 19 5 12" />
                </svg>
                Transfer Funds
              </Button>
            </Link>
            <Link href="/team" className="block">
              <Button variant="secondary" className="w-full">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
                Invite to Team
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
