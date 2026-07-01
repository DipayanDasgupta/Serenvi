"use client";

import { useState, useEffect } from "react";
import { useAPI, useAuthToken } from "@/lib/hooks/use-api";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Distributor } from "@/lib/types";

export default function ProfilePage() {
  // TODO: Replace with actual distributor ID from auth context
  const distributorId = "current";
  const { data: distributor, isLoading, mutate } = useAPI<Distributor>(
    `/distributors/${distributorId}`
  );
  const getToken = useAuthToken();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankIFSC, setBankIFSC] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (distributor) {
      setName(distributor.name || "");
      setPhone(distributor.phone || "");
      setBankAccount(distributor.bankAccount || "");
      setBankIFSC(distributor.bankIFSC || "");
      setBankAccountHolder(distributor.bankAccountHolder || "");
    }
  }, [distributor]);

  const handleSave = async () => {
    setError("");
    setSuccess("");
    setIsSaving(true);
    try {
      const token = await getToken();
      await api.put(
        `/distributors/${distributorId}`,
        {
          name,
          phone,
          bankAccount,
          bankIFSC: bankIFSC.toUpperCase(),
          bankAccountHolder,
        },
        token
      );
      setSuccess("Profile updated successfully.");
      mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyReferral = () => {
    if (distributor?.referralCode) {
      navigator.clipboard.writeText(distributor.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerateCode = async () => {
    setIsRegenerating(true);
    try {
      const token = await getToken();
      await api.post(`/distributors/${distributorId}/regenerate-code`, {}, token);
      mutate();
    } catch {
      setError("Failed to regenerate referral code.");
    } finally {
      setIsRegenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile Settings</h1>
        <p className="mt-1 text-muted">
          Manage your personal information and bank details.
        </p>
      </div>

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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <Card title="Personal Information">
            <div className="space-y-4">
              <Input
                label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
              />
              <Input
                label="Email"
                value={distributor?.email || ""}
                disabled
                placeholder="Email from Clerk"
              />
              <Input
                label="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Your phone number"
              />
            </div>
          </Card>

          {/* Bank Details */}
          <Card title="Bank Details" subtitle="Required for withdrawals">
            <div className="space-y-4">
              <Input
                label="Account Number"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="Bank account number"
              />
              <Input
                label="IFSC Code"
                value={bankIFSC}
                onChange={(e) => setBankIFSC(e.target.value.toUpperCase())}
                placeholder="e.g. SBIN0001234"
              />
              <Input
                label="Account Holder Name"
                value={bankAccountHolder}
                onChange={(e) => setBankAccountHolder(e.target.value)}
                placeholder="Name as per bank records"
              />
            </div>
          </Card>

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleSave}
            isLoading={isSaving}
          >
            Save Changes
          </Button>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Referral Code */}
          <Card title="Referral Code">
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl bg-surface-2 p-4">
                <span className="flex-1 text-xl font-mono font-bold text-accent tracking-widest text-center">
                  {distributor?.referralCode || "------"}
                </span>
                <button
                  onClick={handleCopyReferral}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                  title="Copy referral code"
                >
                  {copied ? (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                  )}
                </button>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={handleRegenerateCode}
                isLoading={isRegenerating}
              >
                Regenerate Code
              </Button>
            </div>
          </Card>

          {/* Account Info */}
          <Card title="Account Info">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Rank</span>
                <Badge variant="info">{distributor?.rank || "Starter"}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Status</span>
                <Badge variant={distributor?.status === "ACTIVE" ? "success" : "danger"}>
                  {distributor?.status || "ACTIVE"}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Member Since</span>
                <span className="text-foreground">
                  {distributor?.createdAt
                    ? new Date(distributor.createdAt).toLocaleDateString("en-IN", {
                        month: "short",
                        year: "numeric",
                      })
                    : "-"}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
