"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useAPI } from "@/lib/hooks/use-api";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUS_VARIANTS: Record<string, "success" | "warning" | "danger" | "info" | "default"> = {
  COMPLETED: "success",
  DELIVERED: "success",
  PENDING: "warning",
  SHIPPED: "info",
  REFUNDED: "danger",
  CANCELLED: "danger",
};

const FILTER_TABS = [
  { label: "All", value: "ALL" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Pending", value: "PENDING" },
  { label: "Refunded", value: "REFUNDED" },
];

// Matches backend GET /admin/orders (admin.service getAllOrders).
interface AdminOrder {
  id: string;
  buyer?: { name?: string; email?: string } | null;
  product?: { name?: string } | null;
  quantity?: number;
  saleAmount?: number | string;
  paymentMethod?: string;
  orderStatus?: string;
  createdAt?: string;
}

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function AdminOrdersPage() {
  const { data, isLoading } = useAPI<AdminOrder[] | { orders: AdminOrder[] }>("/admin/orders");
  // Backend returns a plain array; normalize defensively.
  const orders: AdminOrder[] = Array.isArray(data) ? data : data?.orders ?? [];
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filtered = useMemo(() => {
    if (statusFilter === "ALL") return orders;
    return orders.filter((o) => o.orderStatus === statusFilter);
  }, [orders, statusFilter]);

  const columns = [
    {
      key: "id",
      label: "Order ID",
      render: (item: AdminOrder) => (
        <span className="text-sm font-mono text-muted">
          {typeof item.id === "string" ? `${item.id.slice(0, 8)}...` : "—"}
        </span>
      ),
    },
    {
      key: "buyer",
      label: "User",
      render: (item: AdminOrder) => (
        <span className="text-sm font-medium text-foreground">
          {item.buyer?.name || item.buyer?.email || "—"}
        </span>
      ),
    },
    {
      key: "product",
      label: "Product",
      render: (item: AdminOrder) => (
        <span className="text-sm text-foreground">
          {item.product?.name || "Product"}
          {item.quantity && item.quantity > 1 ? ` × ${item.quantity}` : ""}
        </span>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      render: (item: AdminOrder) => (
        <span className="text-sm font-semibold text-foreground">
          {formatCurrency(num(item.saleAmount))}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (item: AdminOrder) => (
        <Badge variant={STATUS_VARIANTS[item.orderStatus ?? ""] || "default"}>
          {item.orderStatus || "—"}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      label: "Date",
      render: (item: AdminOrder) => (
        <span className="text-sm text-muted">
          {item.createdAt ? formatDate(item.createdAt) : "—"}
        </span>
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
        <h1 className="text-2xl font-bold text-foreground">Order Management</h1>
        <p className="mt-1 text-muted">View and manage all orders across the platform.</p>
      </div>

      <Tabs
        tabs={FILTER_TABS}
        activeTab={statusFilter}
        onChange={setStatusFilter}
      />

      <div className="glass rounded-2xl p-6">
        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          emptyMessage="No orders found."
        />
      </div>
    </div>
  );
}
