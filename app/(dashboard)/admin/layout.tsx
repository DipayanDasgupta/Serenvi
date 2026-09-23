"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useMyDistributor } from "@/lib/hooks/use-distributor";
import { ADMIN_EMAIL } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

// Only the admin account may view any /admin route. Backend enforces the
// same rule via AdminGuard (JWT isAdmin) — this is the UI layer.
export default function AdminLayout({ children }: { children: ReactNode }) {
  const { data: me, isLoading } = useMyDistributor();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!me || me.email?.toLowerCase() !== ADMIN_EMAIL) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-danger/10">
          <svg className="h-10 w-10 text-danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
        <p className="text-muted mb-8 max-w-md">
          This area is restricted to administrators.
        </p>
        <Link href="/dashboard">
          <Button variant="primary">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
