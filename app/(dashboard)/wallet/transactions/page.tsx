"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useWalletTransactions } from "@/lib/hooks/use-wallet";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/utils";
import { TRANSACTION_TYPE_COLORS } from "@/lib/constants";
import type { WalletTransaction } from "@/lib/types";

const FILTER_TABS = [
  { label: "All", value: "ALL" },
  { label: "Commissions", value: "COMMISSION" },
  { label: "Achievements", value: "ACHIEVEMENT" },
  { label: "Salary", value: "SALARY" },
  { label: "Purchases", value: "PURCHASE" },
  { label: "Transfers", value: "TRANSFER" },
];

const TYPE_BADGE_VARIANTS: Record<string, "success" | "warning" | "danger" | "info" | "default"> = {
  COMMISSION: "success",
  ACHIEVEMENT: "warning",
  SALARY: "info",
  PURCHASE: "danger",
  WITHDRAWAL: "danger",
  DEPOSIT: "success",
  TRANSFER: "info",
  REFUND: "default",
};

export default function TransactionsPage() {
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(0);
  const pageSize = 25;
  const { data: transactions, isLoading } = useWalletTransactions(0, 200);

  const filtered = useMemo(() => {
    if (!transactions) return [];
    if (filter === "ALL") return transactions;
    return transactions.filter((tx) => tx.type === filter);
  }, [transactions, filter]);

  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const isCredit = (type: string) =>
    ["COMMISSION", "ACHIEVEMENT", "SALARY", "DEPOSIT", "REFUND"].includes(type);

  const columns = [
    {
      key: "createdAt",
      label: "Date",
      render: (item: WalletTransaction) => (
        <span className="text-sm text-muted">{formatDate(item.createdAt)}</span>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (item: WalletTransaction) => (
        <Badge variant={TYPE_BADGE_VARIANTS[item.type] || "default"}>
          {item.type}
        </Badge>
      ),
    },
    {
      key: "description",
      label: "Description",
      render: (item: WalletTransaction) => (
        <span className="text-sm text-foreground">{item.description}</span>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      render: (item: WalletTransaction) => (
        <span className={`text-sm font-semibold ${isCredit(item.type) ? "text-success" : "text-danger"}`}>
          {isCredit(item.type) ? "+" : "-"}{formatCurrency(Math.abs(item.amount))}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Link
          href="/wallet"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors mb-4"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Wallet
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Transaction History</h1>
        <p className="mt-1 text-muted">View all wallet transactions.</p>
      </div>

      <Tabs
        tabs={FILTER_TABS}
        activeTab={filter}
        onChange={(val) => {
          setFilter(val);
          setPage(0);
        }}
      />

      <div className="glass rounded-2xl p-6">
        <DataTable
          columns={columns}
          data={paginated}
          isLoading={isLoading}
          emptyMessage="No transactions found."
        />

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
            <span className="text-sm text-muted">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages - 1}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
