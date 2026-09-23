"use client";

import Link from "next/link";
import { useAPI } from "@/lib/hooks/use-api";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { AdminStats } from "@/lib/types";

const STATUS_VARIANTS: Record<string, "success" | "warning" | "danger" | "default"> = {
  COMPLETED: "success",
  PENDING: "warning",
  REFUNDED: "danger",
  REJECTED: "danger",
  FAILED: "danger",
};

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useAPI<AdminStats>("/admin/stats");
  const pending = stats?.depositsSummary;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="mt-1 text-muted">Platform overview and management.</p>
      </div>

      {/* Stat Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Users"
            value={String(stats?.totalUsers || 0)}
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
            title="Total Sales"
            value={formatCurrency(stats?.totalSales || 0)}
            icon={
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
            }
          />
          <StatCard
            title="Total Orders"
            value={String(stats?.totalOrders || 0)}
            icon={
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
            }
          />
          <StatCard
            title="Total Commissions"
            value={formatCurrency(stats?.totalCommissions || 0)}
            icon={
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            }
          />
        </div>
      )}

      {/* Deposit verification banner */}
      {!isLoading && (pending?.pendingCount || 0) > 0 && (
        <Link href="/admin/deposits" className="block">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-5 py-4 transition-colors hover:bg-warning/15">
            <div>
              <p className="font-semibold text-foreground">
                {pending?.pendingCount} deposit{pending?.pendingCount !== 1 ? "s" : ""} awaiting verification
                ({formatCurrency(pending?.pendingAmount || 0)})
              </p>
              <p className="text-sm text-muted">Verify UPI payments and approve to credit wallets.</p>
            </div>
            <Button variant="primary">Verify Now</Button>
          </div>
        </Link>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Orders */}
        <Card title="Recent Orders" className="lg:col-span-2">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !stats?.recentOrders || stats.recentOrders.length === 0 ? (
            <p className="py-8 text-center text-muted">No recent orders.</p>
          ) : (
            <div className="space-y-2">
              {stats.recentOrders.slice(0, 10).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-xl bg-surface-2/50 px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {order.product?.name || "Product"}
                    </p>
                    <p className="text-xs text-muted">
                      Qty: {order.quantity} &middot; {order.paymentMethod} &middot; {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <Badge variant={STATUS_VARIANTS[order.status] || "default"}>
                      {order.status}
                    </Badge>
                    <span className="text-sm font-semibold text-foreground">
                      {formatCurrency(order.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-6">
          {/* Recent Deposits */}
          <Card title="Recent Deposits">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !stats?.recentDeposits || stats.recentDeposits.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">No deposits yet.</p>
            ) : (
              <div className="space-y-2">
                {stats.recentDeposits.slice(0, 5).map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-surface-2/50 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {d.distributor?.name || "Unknown"}
                      </p>
                      <p className="text-xs text-muted">
                        UTR {d.transactionId || "—"} &middot; {formatDate(d.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {formatCurrency(d.amount)}
                      </span>
                      <Badge variant={STATUS_VARIANTS[d.status] || "default"}>{d.status}</Badge>
                    </div>
                  </div>
                ))}
                <Link href="/admin/deposits" className="block pt-1 text-center text-sm font-semibold text-accent hover:underline">
                  Open verification →
                </Link>
              </div>
            )}
          </Card>

          {/* Quick Links */}
          <Card title="Quick Links">
            <div className="space-y-3">
              <Link href="/admin/users" className="block">
                <Button variant="secondary" className="w-full justify-start">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 00-3-3.87" />
                    <path d="M16 3.13a4 4 0 010 7.75" />
                  </svg>
                  Manage Users
                </Button>
              </Link>
              <Link href="/admin/orders" className="block">
                <Button variant="secondary" className="w-full justify-start">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  Manage Orders
                </Button>
              </Link>
              <Link href="/admin/deposits" className="block">
                <Button variant="secondary" className="w-full justify-start">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                  Verify Deposits
                  {(pending?.pendingCount || 0) > 0 && (
                    <span className="ml-auto rounded-full bg-warning/20 px-2 py-0.5 text-xs font-bold text-warning">
                      {pending?.pendingCount}
                    </span>
                  )}
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
