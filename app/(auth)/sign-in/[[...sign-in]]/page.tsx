import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { ClerkErrorBoundary } from "@/components/clerk-error-boundary";

// Auth pages must render per-request: the ClerkProvider gate in the root
// layout reads server env, which is only reliable at request time (Docker
// builds have no secrets). Static prerender would bake a provider-less tree.
export const dynamic = "force-dynamic";

export default function SignInPage() {
  // TODO(clerk): remove fallback once Clerk keys are configured.
  if (!process.env.CLERK_SECRET_KEY) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="glass max-w-sm rounded-2xl p-8 text-center">
          <h1 className="text-xl font-semibold text-foreground">
            Sign-in isn&apos;t available yet
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Authentication is still being configured. Please check back soon.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <ClerkErrorBoundary title="Sign-in failed to load">
        <SignIn
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-surface border border-border shadow-2xl",
            },
          }}
        />
      </ClerkErrorBoundary>
    </div>
  );
}
