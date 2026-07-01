import type { ReactNode } from "react";

// TODO: Add admin role check using Clerk metadata or backend verification.
// For now, render children directly. When auth integration is complete,
// check user role and show "Access Denied" if not admin.

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
