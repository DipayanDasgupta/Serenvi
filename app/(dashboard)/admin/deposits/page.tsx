"use client";

import { useState } from "react";
import Link from "next/link";
import { useAdminDeposits, useWalletActions } from "@/lib/hooks/use-wallet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUS_VARIANTS: Record<string, "success" | "warning" | "danger" | "default"> = {
  COMPLETED: "success",
  PENDING: "warning",
  REJECTED: "danger",
  FAILED: "danger",
};

const FILTERS = ["PENDING", "ALL", "COMPLETED", "REJECTED"] as const;

export default function AdminDepositsPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("PENDING");
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const status = filter === "ALL" ? undefined : filter;
  const { data, isLoading, mutate } = useAdminDeposits(status, 0, 50);
  const { approveDeposit, rejectDeposit } = useWalletActions();

  const handleApprove = async (id: string, amount: number) => {
    if (!confirm(`Approve deposit of ${formatCurrency(amount)}? Wallet will be credited.`)) return;
    setError("");
    setNotice("");
    setBusyId(id);
    try {
      await approveDeposit(id);
      setNotice("Deposit approved and wallet credited.");
      mutate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed.");
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Reject this deposit? No money will be credited.")) return;
    setError("");
    setNotice("");
    setBusyId(id);
    try {
      await rejectDeposit(id, rejectReason[id] || "Rejected by admin");
      setNotice("Deposit rejected.");
      mutate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rejection failed.");
    } finally {
      setBusyId(null);
    }
  };

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
        <h1 className="text-2xl font-bold text-foreground">Deposit Verification</h1>
        <p className="mt-1 text-muted">
          Verify UPI payments against your bank statement, then approve to credit wallets.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === f
                ? "bg-accent text-white"
                : "bg-surface-2 text-muted hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {notice && (
        <div className="rounded-xl bg-success/10 border border-success/20 p-4">
          <p className="text-sm text-success">{notice}</p>
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-danger/10 border border-danger/20 p-4">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      <Card>
        {isLoading ? (
          <p className="text-sm text-muted">Loading deposits…</p>
        ) : !data?.deposits?.length ? (
          <p className="text-sm text-muted">No {filter === "ALL" ? "" : filter.toLowerCase() + " "}deposits.</p>
        ) : (
          <div className="space-y-4">
            {data.deposits.map((d) => (
              <div key={d.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-bold text-foreground">{formatCurrency(d.amount)}</p>
                    <p className="text-xs text-muted">
                      {d.distributor?.name || "Unknown"} · {d.distributor?.email || ""} ·{" "}
                      <span className="font-mono">{d.distributor?.referralCode || ""}</span>
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      UTR <span className="font-mono font-semibold text-foreground">{d.transactionId || "—"}</span> ·{" "}
                      {formatDate(d.createdAt)}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANTS[d.status] || "default"}>{d.status}</Badge>
                </div>
                {d.status === "PENDING" && (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                      placeholder="Reject reason (optional)"
                      value={rejectReason[d.id] || ""}
                      onChange={(e) => setRejectReason((p) => ({ ...p, [d.id]: e.target.value }))}
                      className="sm:flex-1"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        onClick={() => handleApprove(d.id, d.amount)}
                        isLoading={busyId === d.id}
                      >
                        Approve
                      </Button>
                      <Button variant="secondary" onClick={() => handleReject(d.id)} disabled={busyId === d.id}>
                        Reject
                      </Button>
                    </div>
                  </div>
                )}
                {d.status === "REJECTED" && d.notes && (
                  <p className="mt-2 text-xs text-muted">Reason: {d.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
