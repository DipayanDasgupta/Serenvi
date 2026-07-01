"use client";

import { useState } from "react";
import Link from "next/link";
import { useWallet, useWalletActions } from "@/lib/hooks/use-wallet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { formatCurrency } from "@/lib/utils";

export default function TransferPage() {
  const { wallet } = useWallet();
  const { transfer, sendTPin } = useWalletActions();

  const [referralCode, setReferralCode] = useState("");
  const [amount, setAmount] = useState("");
  const [tPin, setTPin] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isSendingPin, setIsSendingPin] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!referralCode || referralCode.length !== 6) {
      newErrors.referralCode = "Referral code must be 6 characters";
    }
    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = "Enter a valid amount";
    }
    if (parseFloat(amount) > (wallet?.balance || 0)) {
      newErrors.amount = "Insufficient balance";
    }
    if (!tPin || tPin.length !== 6 || !/^\d{6}$/.test(tPin)) {
      newErrors.tPin = "T-PIN must be 6 digits";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    setError("");
    setSuccessMessage("");
    if (!validate()) return;
    setShowConfirm(true);
  };

  const handleConfirmTransfer = async () => {
    setShowConfirm(false);
    setIsTransferring(true);
    setError("");
    try {
      await transfer(referralCode.toUpperCase(), parseFloat(amount), tPin);
      setSuccessMessage(`Successfully transferred ${formatCurrency(parseFloat(amount))} to ${referralCode.toUpperCase()}`);
      setReferralCode("");
      setAmount("");
      setTPin("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transfer failed. Please try again.");
    } finally {
      setIsTransferring(false);
    }
  };

  const handleSendTPin = async () => {
    setIsSendingPin(true);
    try {
      await sendTPin();
      setSuccessMessage("T-PIN sent to your registered email.");
    } catch {
      setError("Failed to send T-PIN. Please try again.");
    } finally {
      setIsSendingPin(false);
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
        <h1 className="text-2xl font-bold text-foreground">Transfer Funds</h1>
        <p className="mt-1 text-muted">Send funds to another team member using their referral code.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <div className="space-y-5">
              {/* Success */}
              {successMessage && (
                <div className="rounded-xl bg-success/10 border border-success/20 p-4">
                  <p className="text-sm text-success">{successMessage}</p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="rounded-xl bg-danger/10 border border-danger/20 p-4">
                  <p className="text-sm text-danger">{error}</p>
                </div>
              )}

              <Input
                label="Recipient Referral Code"
                placeholder="e.g. ABC123"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase().slice(0, 6))}
                error={errors.referralCode}
                maxLength={6}
              />

              <Input
                label="Amount"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                error={errors.amount}
                min="1"
              />

              <div className="space-y-2">
                <Input
                  label="T-PIN"
                  type="password"
                  placeholder="Enter 6-digit T-PIN"
                  value={tPin}
                  onChange={(e) => setTPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  error={errors.tPin}
                  maxLength={6}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSendTPin}
                  isLoading={isSendingPin}
                >
                  Send T-PIN to Email
                </Button>
              </div>

              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleSubmit}
                isLoading={isTransferring}
              >
                Transfer Funds
              </Button>
            </div>
          </Card>
        </div>

        {/* Balance Sidebar */}
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

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Confirm Transfer"
      >
        <div className="space-y-4">
          <p className="text-muted">Are you sure you want to transfer?</p>
          <div className="space-y-2 rounded-xl bg-surface-2 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Recipient</span>
              <span className="font-semibold text-foreground">{referralCode}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Amount</span>
              <span className="font-semibold text-foreground">{amount ? formatCurrency(parseFloat(amount)) : "-"}</span>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button variant="primary" className="flex-1" onClick={handleConfirmTransfer}>
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
