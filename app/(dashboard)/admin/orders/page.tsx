"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useAPI, useAuthToken } from "@/lib/hooks/use-api";
import { api } from "@/lib/api-client";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { OrderStatus } from "@/lib/types";

const STATUS_VARIANTS: Record<string, "success" | "warning" | "danger" | "info" | "default"> = {
  COMPLETED: "success",
  DELIVERED: "success",
  PROCESSING: "info",
  PENDING: "warning",
  SHIPPED: "info",
  REFUNDED: "danger",
  CANCELLED: "danger",
};

// Forward-only fulfilment flow. REFUNDED is handled separately because it
// triggers the full compensating reversal on the backend.
const FULFILMENT_FLOW: OrderStatus[] = [
  "PENDING",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "COMPLETED",
];

const NEXT_STATUS_LABEL: Record<string, string> = {
  PENDING: "Mark as Processing",
  PROCESSING: "Mark as Shipped",
  SHIPPED: "Mark as Delivered",
  DELIVERED: "Mark as Completed",
  COMPLETED: "Completed",
};

const FILTER_TABS = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Processing", value: "PROCESSING" },
  { label: "Shipped", value: "SHIPPED" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Completed", value: "COMPLETED" },
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
  const { data, isLoading, mutate } = useAPI<AdminOrder[] | { orders: AdminOrder[] }>("/admin/orders");
  // Backend returns a plain array; normalize defensively.
  const orders: AdminOrder[] = Array.isArray(data) ? data : data?.orders ?? [];
  const [statusFilter, setStatusFilter] = useState("ALL");
  const getToken = useAuthToken();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const setOrderStatus = async (orderId: string, status: OrderStatus) => {
    const label = status === "REFUNDED" ? "Refund" : `Mark as ${status}`;
    if (
      status === "REFUNDED" &&
      !confirm(
        "Refund this order? This reverses stock, wallet balances, commissions and sales metrics."
      )
    ) {
      return;
    }
    setBusyId(orderId);
    setError("");
    try {
      const token = await getToken();
      await api.put(`/admin/orders/${orderId}/status`, { status }, token);
      await mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed: ${label}`);
    } finally {
      setBusyId(null);
    }
  };

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
      key: "actions",
      label: "Action",
      render: (item: AdminOrder) => {
        const current = (item.orderStatus ?? "PENDING") as OrderStatus;
        const idx = FULFILMENT_FLOW.indexOf(current);
        const next =
          idx >= 0 && idx < FULFILMENT_FLOW.length - 1
            ? FULFILMENT_FLOW[idx + 1]
            : null;
        const isFinal = idx === FULFILMENT_FLOW.length - 1;
        const isRefunded = current === "REFUNDED";
        const busy = busyId === item.id;

        if (isRefunded) {
          return <span className="text-xs text-muted">No actions</span>;
        }

        return (
          <div className="flex flex-col gap-1.5">
            {next && (
              <Button
                size="sm"
                variant="primary"
                isLoading={busy}
                disabled={busy}
                onClick={() => setOrderStatus(item.id, next)}
              >
                {NEXT_STATUS_LABEL[current] || `Mark as ${next}`}
              </Button>
            )}
            {isFinal && <span className="text-xs text-success">Fulfilled</span>}
            <Button
              size="sm"
              variant="ghost"
              isLoading={busy}
              disabled={busy}
              onClick={() => setOrderStatus(item.id, "REFUNDED")}
            >
              Refund
            </Button>
          </div>
        );
      },
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

      {error && (
        <div className="rounded-xl bg-danger/10 border border-danger/20 p-3">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

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
