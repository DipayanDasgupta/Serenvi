"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useWallet, useWalletActions, useDeposits } from "@/lib/hooks/use-wallet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUS_VARIANTS: Record<string, "success" | "warning" | "danger" | "default"> = {
  COMPLETED: "success",
  PENDING: "warning",
  REJECTED: "danger",
  FAILED: "danger",
};

export default function DepositPage() {
  const { wallet } = useWallet();
  const { deposit } = useWalletActions();
  const { data: history, mutate: refreshHistory } = useDeposits(0, 10);

  const [step, setStep] = useState<1 | 2>(1);
  const [amount, setAmount] = useState("");
  const [utr, setUtr] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const parsedAmount = parseFloat(amount);

  const handleContinue = () => {
    setError("");
    setSuccess("");
    if (!amount || isNaN(parsedAmount) || parsedAmount < 1) {
      setError("Enter a valid amount (minimum ₹1)");
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    setError("");
    setSuccess("");
    if (!/^[A-Za-z0-9]{6,30}$/.test(utr.trim())) {
      setError("Enter the 12-digit UTR / UPI reference ID from your payment app");
      return;
    }
    setIsSubmitting(true);
    try {
      await deposit(parsedAmount, "UPI", utr.trim());
      setSuccess(
        `Payment of ${formatCurrency(parsedAmount)} submitted. Your wallet will be credited after admin verification.`
      );
      setAmount("");
      setUtr("");
      setStep(1);
      refreshHistory?.();
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
        <p className="mt-1 text-muted">Pay via UPI, then submit the UTR for verification.</p>
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

              {step === 1 ? (
                <>
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
                        <p className="text-xs text-muted mt-1">Google Pay, PhonePe, Paytm, etc.</p>
                      </div>
                    </div>
                  </div>
                  <Button variant="primary" size="lg" className="w-full" onClick={handleContinue}>
                    Continue to Pay {amount && !isNaN(parsedAmount) ? formatCurrency(parsedAmount) : ""}
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface-2 p-5">
                    <p className="text-sm font-medium text-foreground">
                      Scan to pay {formatCurrency(parsedAmount)}
                    </p>
                    <div className="overflow-hidden rounded-xl border border-border bg-white p-2">
                      <Image
                        src="/upi-qr.jpg"
                        alt="SERENVI UPI QR code"
                        width={260}
                        height={320}
                        className="h-auto w-[240px]"
                        priority
                      />
                    </div>
                    <ol className="w-full list-decimal space-y-1 pl-5 text-xs text-muted">
                      <li>Open any UPI app (GPay / PhonePe / Paytm).</li>
                      <li>Scan the QR and pay exactly {formatCurrency(parsedAmount)}.</li>
                      <li>Copy the 12-digit UTR / UPI Ref No. from the payment receipt.</li>
                      <li>Paste it below and submit — admin verifies and credits your wallet.</li>
                    </ol>
                  </div>

                  <Input
                    label="UTR / UPI Reference ID"
                    placeholder="e.g. 423976543210"
                    value={utr}
                    onChange={(e) => setUtr(e.target.value)}
                    maxLength={30}
                  />

                  <div className="flex gap-3">
                    <Button variant="secondary" size="lg" className="flex-1" onClick={() => setStep(1)}>
                      Back
                    </Button>
                    <Button
                      variant="primary"
                      size="lg"
                      className="flex-[2]"
                      onClick={handleSubmit}
                      isLoading={isSubmitting}
                    >
                      I&apos;ve Paid — Submit
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Card>

          <Card className="mt-6">
            <h2 className="mb-4 text-base font-semibold text-foreground">Recent deposits</h2>
            {!history?.deposits?.length ? (
              <p className="text-sm text-muted">No deposits yet. Your submissions will show up here.</p>
            ) : (
              <div className="space-y-3">
                {history.deposits.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(d.amount)}</p>
                      <p className="text-xs text-muted">
                        UTR {d.transactionId || "—"} · {formatDate(d.createdAt)}
                      </p>
                    </div>
                    <Badge variant={STATUS_VARIANTS[d.status] || "default"}>{d.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div>
          <Card>
            <div className="text-center">
              <p className="text-sm text-muted mb-1">Current Balance</p>
              <p className="text-3xl font-bold text-foreground">
                {formatCurrency(wallet?.balance || 0)}
              </p>
              <p className="mt-3 text-xs text-muted">
                Deposits are credited after admin verification, usually within a few hours.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
