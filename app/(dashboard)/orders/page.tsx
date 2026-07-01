"use client";

import { useState } from "react";
import { useAPI } from "@/lib/hooks/use-api";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Sale, PaginatedResponse } from "@/lib/types";

const STATUS_VARIANTS: Record<string, "success" | "warning" | "danger"> = {
  COMPLETED: "success",
  PENDING: "warning",
  REFUNDED: "danger",
};

export default function OrdersPage() {
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const { data, isLoading } = useAPI<PaginatedResponse<Sale>>(
    `/sales/history?skip=${page * pageSize}&take=${pageSize}`
  );

  const orders = data?.data || [];
  const totalOrders = data?.total || 0;
  const hasMore = (page + 1) * pageSize < totalOrders;

  const columns = [
    {
      key: "createdAt",
      label: "Date",
      render: (item: Sale) => (
        <span className="text-sm text-muted">{formatDate(item.createdAt)}</span>
      ),
    },
    {
      key: "product",
      label: "Product",
      render: (item: Sale) => (
        <span className="text-sm font-medium text-foreground">
          {item.product?.name || "Product"}
        </span>
      ),
    },
    {
      key: "quantity",
      label: "Quantity",
      render: (item: Sale) => (
        <span className="text-sm text-foreground">{item.quantity}</span>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      render: (item: Sale) => (
        <span className="text-sm font-semibold text-foreground">
          {formatCurrency(item.amount)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (item: Sale) => (
        <Badge variant={STATUS_VARIANTS[item.status] || "default"}>
          {item.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Order History</h1>
        <p className="mt-1 text-muted">
          View all your past orders and their status.
        </p>
      </div>

      {!isLoading && orders.length === 0 ? (
        <EmptyState
          icon={
            <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          }
          title="No orders yet"
          description="Your order history will appear here after you make a purchase."
        />
      ) : (
        <div className="glass rounded-2xl p-6">
          <DataTable
            columns={columns}
            data={orders}
            isLoading={isLoading}
            emptyMessage="No orders found."
          />

          {/* Pagination */}
          {totalOrders > pageSize && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
              <span className="text-sm text-muted">
                Showing {page * pageSize + 1} - {Math.min((page + 1) * pageSize, totalOrders)} of {totalOrders}
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
                  disabled={!hasMore}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
