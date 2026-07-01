"use client";

import { useState } from "react";
import Link from "next/link";
import { useWallet, useWalletActions } from "@/lib/hooks/use-wallet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";

export default function DepositPage() {
  const { wallet } = useWallet();
  const { deposit } = useWalletActions();

  const [amount, setAmount] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleDeposit = async () => {
    setError("");
    setSuccess("");

    if (!amount || parseFloat(amount) <= 0) {
      setError("Enter a valid amount");
      return;
    }

    setIsSubmitting(true);
    try {
      await deposit(parseFloat(amount), "UPI", transactionId || undefined);
      setSuccess(`Deposit of ${formatCurrency(parseFloat(amount))} submitted successfully.`);
      setAmount("");
      setTransactionId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deposit failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <h1 className="text-2xl font-bold text-foreground">Deposit Funds</h1>
        <p className="mt-1 text-muted">Add funds to your wallet via UPI.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <div className="space-y-5">
              {success && (
                <div className="rounded-xl bg-success/10 border border-success/20 p-4">
                  <p className="text-sm text-success">{success}</p>
                </div>
              )}
              {error && (
                <div className="rounded-xl bg-danger/10 border border-danger/20 p-4">
                  <p className="text-sm text-danger">{error}</p>
                </div>
              )}

              <Input
                label="Amount"
                type="number"
                placeholder="Enter deposit amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
              />

              <div>
                <p className="mb-2 text-sm font-medium text-muted">Payment Method</p>
                <div className="flex gap-3">
                  <div className="flex-1 rounded-xl border-2 border-accent bg-accent/5 p-4 text-center cursor-default">
                    <p className="font-semibold text-accent">UPI</p>
                    <p className="text-xs text-muted mt-1">Google Pay, PhonePe, etc.</p>
                  </div>
                </div>
              </div>

              <Input
                label="Transaction ID (optional)"
                placeholder="UPI transaction reference ID"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
              />

              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleDeposit}
                isLoading={isSubmitting}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
                Deposit {amount ? formatCurrency(parseFloat(amount)) : ""}
              </Button>
            </div>
          </Card>
        </div>

        <div>
          <Card>
            <div className="text-center">
              <p className="text-sm text-muted mb-1">Current Balance</p>
              <p className="text-3xl font-bold text-foreground">
                {formatCurrency(wallet?.balance || 0)}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
