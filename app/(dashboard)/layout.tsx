import { DashboardShell } from "@/components/layout/dashboard-shell";

// Dashboard pages depend on Clerk auth context at render time, so they must
// not be statically prerendered (without configured keys there is no
// ClerkProvider). Runtime access is gated by proxy.ts.
export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
