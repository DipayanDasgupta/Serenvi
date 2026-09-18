import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";

const isClerkConfigured = !!process.env.CLERK_SECRET_KEY;

function AuthActions() {
  // TODO(clerk): remove fallback once Clerk keys are configured.
  if (!isClerkConfigured) {
    return (
      <>
        <Link
          href="/sign-in"
          className="rounded-xl px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          Sign In
        </Link>
        <Link
          href="/sign-up"
          className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Get Started
        </Link>
      </>
    );
  }

  return (
    <>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button className="rounded-xl px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60">
            Sign In
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            Get Started
          </button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <Link
          href="/dashboard"
          className="mr-2 rounded-xl bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          Dashboard
        </Link>
        <UserButton />
      </Show>
    </>
  );
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="gradient-text text-2xl font-bold tracking-wider">
            SERENVI
          </Link>

          <nav className="hidden md:flex items-center gap-8" aria-label="Primary">
            <Link
              href="/#features"
              className="text-sm text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 rounded"
            >
              Features
            </Link>
            <Link
              href="/#how-it-works"
              className="text-sm text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 rounded"
            >
              How it Works
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <AuthActions />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <span className="gradient-text text-lg font-bold tracking-wider">
              SERENVI
            </span>
            <p className="text-sm text-muted">
              &copy; {new Date().getFullYear()} Serenvi. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
