"use client";

import { useState } from "react";
import Link from "next/link";
import { useWallet, useWalletActions } from "@/lib/hooks/use-wallet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";

export default function WithdrawPage() {
  const { wallet } = useWallet();
  const { withdraw } = useWalletActions();

  const [amount, setAmount] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    const numAmount = parseFloat(amount);
    if (!amount || numAmount < 500) {
      errors.amount = "Minimum withdrawal amount is Rs. 500";
    }
    if (numAmount > (wallet?.balance || 0)) {
      errors.amount = "Insufficient balance";
    }
    if (!accountNumber || accountNumber.length < 8) {
      errors.accountNumber = "Enter a valid account number";
    }
    if (!ifscCode || !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(ifscCode)) {
      errors.ifscCode = "Enter a valid IFSC code (e.g. SBIN0001234)";
    }
    if (!accountHolder || accountHolder.trim().length < 2) {
      errors.accountHolder = "Enter the account holder name";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleWithdraw = async () => {
    setError("");
    setSuccess("");
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await withdraw(parseFloat(amount), accountNumber, ifscCode.toUpperCase(), accountHolder.trim());
      setSuccess(`Withdrawal request for ${formatCurrency(parseFloat(amount))} submitted successfully.`);
      setAmount("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Withdrawal request failed.");
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
        <h1 className="text-2xl font-bold text-foreground">Withdraw Funds</h1>
        <p className="mt-1 text-muted">Request a withdrawal to your bank account.</p>
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
                label="Withdrawal Amount"
                type="number"
                placeholder="Minimum Rs. 500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                error={fieldErrors.amount}
                min="500"
              />

              <div className="border-t border-border pt-5">
                <p className="text-sm font-semibold text-foreground mb-4">Bank Account Details</p>
                <div className="space-y-4">
                  <Input
                    label="Account Number"
                    placeholder="Enter bank account number"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    error={fieldErrors.accountNumber}
                  />
                  <Input
                    label="IFSC Code"
                    placeholder="e.g. SBIN0001234"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                    error={fieldErrors.ifscCode}
                  />
                  <Input
                    label="Account Holder Name"
                    placeholder="Name as per bank records"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    error={fieldErrors.accountHolder}
                  />
                </div>
              </div>

              <div className="rounded-xl bg-surface-2 p-4">
                <p className="text-xs text-muted">
                  Withdrawals are processed within 24-48 hours. The amount will be credited to the bank account provided above.
                </p>
              </div>

              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleWithdraw}
                isLoading={isSubmitting}
              >
                Submit Withdrawal Request
              </Button>
            </div>
          </Card>
        </div>

        <div>
          <Card>
            <div className="text-center">
              <p className="text-sm text-muted mb-1">Available Balance</p>
              <p className="text-3xl font-bold text-foreground">
                {formatCurrency(wallet?.balance || 0)}
              </p>
              {wallet?.pendingWithdrawals ? (
                <p className="text-xs text-warning mt-2">
                  Pending: {formatCurrency(wallet.pendingWithdrawals)}
                </p>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
