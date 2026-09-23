"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useAPI } from "@/lib/hooks/use-api";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Distributor } from "@/lib/types";

const STATUS_VARIANTS: Record<string, "success" | "warning" | "danger"> = {
  ACTIVE: "success",
  SUSPENDED: "warning",
  BLOCKED: "danger",
};

export default function AdminUsersPage() {
  const { data, isLoading } = useAPI<Distributor[] | { users: Distributor[] }>("/admin/users");
  // Backend returns a plain array; normalize defensively.
  const users: Distributor[] = Array.isArray(data) ? data : data?.users ?? [];
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        (u.name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.referralCode || "").toLowerCase().includes(q)
    );
  }, [users, search]);

  const columns = [
    {
      key: "name",
      label: "Name",
      render: (item: Distributor) => (
        <span className="text-sm font-medium text-foreground">{item.name}</span>
      ),
    },
    {
      key: "email",
      label: "Email",
      render: (item: Distributor) => (
        <span className="text-sm text-muted">{item.email}</span>
      ),
    },
    {
      key: "referralCode",
      label: "Referral Code",
      render: (item: Distributor) => (
        <span className="text-sm font-mono text-accent">{item.referralCode}</span>
      ),
    },
    {
      key: "rank",
      label: "Rank",
      render: (item: Distributor) => (
        <Badge variant="info">{item.rank}</Badge>
      ),
    },
    {
      key: "totalSales",
      label: "Total Sales",
      render: (item: Distributor) => (
        <span className="text-sm font-semibold text-foreground">
          {formatCurrency(Number(item.totalSales) || 0)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (item: Distributor) => (
        <Badge variant={STATUS_VARIANTS[item.status] || "default"}>
          {item.status}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      label: "Joined",
      render: (item: Distributor) => (
        <span className="text-sm text-muted">{formatDate(item.createdAt)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors mb-4"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Admin
        </Link>
        <h1 className="text-2xl font-bold text-foreground">User Management</h1>
        <p className="mt-1 text-muted">View and manage all distributors on the platform.</p>
      </div>

      <Input
        placeholder="Search by name, email, or referral code..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        icon={
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        }
      />

      <div className="glass rounded-2xl p-6">
        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          emptyMessage="No users found."
        />
      </div>
    </div>
  );
}
