"use client";

import Link from "next/link";
import { useAPI } from "@/lib/hooks/use-api";
import { useMyDistributor } from "@/lib/hooks/use-distributor";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import type { TeamAnalytics } from "@/lib/types";

export default function TeamPage() {
  const { data: me } = useMyDistributor();
  const distributorId = me?.id;
  const { data: analytics, isLoading } = useAPI<TeamAnalytics>(
    distributorId ? `/distributors/${distributorId}/team` : null
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Team Analytics</h1>
        <p className="mt-1 text-muted">
          Overview of your team performance and structure.
        </p>
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
            title="Total Team Size"
            value={String(analytics?.totalTeamSize || 0)}
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
            title="Active Members"
            value={String(analytics?.activeMembers || 0)}
            icon={
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <polyline points="17 11 19 13 23 9" />
              </svg>
            }
          />
          <StatCard
            title="Total Team Sales"
            value={formatCurrency(analytics?.totalTeamSales || 0)}
            icon={
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
            }
          />
          <StatCard
            title="Monthly Team Sales"
            value={formatCurrency(analytics?.monthlyTeamSales || 0)}
            icon={
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            }
          />
        </div>
      )}

      {/* Sales by Level */}
      <Card title="Sales by Level">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !analytics?.salesByLevel || analytics.salesByLevel.length === 0 ? (
          <p className="py-8 text-center text-muted">No team sales data available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted">Level</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted">Members</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted text-right">Sales Amount</th>
                </tr>
              </thead>
              <tbody>
                {analytics.salesByLevel.map((row) => (
                  <tr key={row.level} className="border-b border-border/50 hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-3">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-xs font-semibold text-accent">
                        {row.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground">{row.members}</td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">
                      {formatCurrency(row.sales)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/team/downline" className="block">
          <div className="glass rounded-2xl p-6 hover:bg-surface-hover transition-colors cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="5" r="3" />
                  <line x1="12" y1="8" x2="12" y2="14" />
                  <circle cx="7" cy="19" r="3" />
                  <circle cx="17" cy="19" r="3" />
                  <line x1="12" y1="14" x2="7" y2="16" />
                  <line x1="12" y1="14" x2="17" y2="16" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-foreground">Downline Tree</p>
                <p className="text-sm text-muted">View your team hierarchy</p>
              </div>
              <svg className="h-5 w-5 text-muted ml-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>
        </Link>
        <Link href="/team/upline" className="block">
          <div className="glass rounded-2xl p-6 hover:bg-surface-hover transition-colors cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-2/10 text-accent-2">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-foreground">Upline Chain</p>
                <p className="text-sm text-muted">View your sponsor chain</p>
              </div>
              <svg className="h-5 w-5 text-muted ml-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
