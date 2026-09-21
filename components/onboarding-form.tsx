"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthToken } from "@/lib/hooks/use-api";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function OnboardingForm() {
  const router = useRouter();
  const getToken = useAuthToken();
  const { isLoaded, isSignedIn } = useAuth();
  const [checking, setChecking] = useState(true);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Wait for Clerk to hydrate — on first mount isSignedIn is false even
    // for logged-in users, which would wrongly bounce to "/".
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/");
      return;
    }
    (async () => {
      const token = await getToken();
      if (!token) {
        router.replace("/");
        return;
      }
      try {
        const me = await api.get<{ sponsorId?: string | null }>("/distributors/me", token);
        if (me?.sponsorId) {
          router.replace("/dashboard");
          return;
        }
      } catch {
        // Backend unreachable — don't trap the user here.
        router.replace("/dashboard");
        return;
      }
      setChecking(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const referralCode = code.toUpperCase().trim();
    if (!/^[A-Z0-9]{6}$/.test(referralCode)) {
      setError("Referral code must be exactly 6 letters or numbers.");
      return;
    }
    setSaving(true);
    try {
      const token = await getToken();
      await api.post("/distributors/me/sponsor", { referralCode }, token);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not apply referral code.");
    } finally {
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted">Setting up your account…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card
        title="Who invited you?"
        subtitle="Enter the 6-character referral code of your sponsor to join their team. This connects your commissions upline and cannot be changed later."
        className="w-full max-w-md"
      >
        <form onSubmit={submit} className="space-y-4">
          <Input
            label="Referral code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. ABC123"
            maxLength={6}
            error={error || undefined}
          />
          <Button type="submit" variant="primary" className="w-full" isLoading={saving}>
            Join team
          </Button>
          <Link
            href="/dashboard"
            className="block text-center text-sm text-muted transition-colors hover:text-foreground"
          >
            Skip for now — I don&apos;t have a code
          </Link>
        </form>
      </Card>
    </div>
  );
}
