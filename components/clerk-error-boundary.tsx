"use client";

import { Component, type ReactNode } from "react";
import Link from "next/link";

interface Props {
  children: ReactNode;
  title: string;
}

// Auth widgets (Clerk) load third-party scripts that ad-blockers and
// dashboard misconfigurations can break. Never take down the whole page.
export class ClerkErrorBoundary extends Component<Props, { failed: boolean; message: string }> {
  state = { failed: false, message: "" };

  static getDerivedStateFromError(error: unknown) {
    return {
      failed: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  private resetAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore storage failures
    }
    try {
      document.cookie.split(";").forEach((c) => {
        const name = c.split("=")[0]?.trim();
        if (name) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        }
      });
    } catch {
      // ignore cookie failures
    }
    window.location.reload();
  };

  render() {
    if (this.state.failed) {
      return (
        <div className="glass max-w-sm rounded-2xl p-8 text-center">
          <h1 className="text-xl font-semibold text-foreground">{this.props.title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            The sign-in widget failed to load. Ad-blockers often block
            authentication scripts — disable shields for this site and retry.
          </p>
          {this.state.message && (
            <p className="mt-2 font-mono text-xs break-all text-danger/80">
              {this.state.message}
            </p>
          )}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
            >
              Retry
            </button>
            <button
              onClick={this.resetAndReload}
              className="inline-flex items-center rounded-xl border border-border px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-2"
            >
              Clear site data & reload
            </button>
            <Link
              href="/"
              className="inline-flex items-center rounded-xl border border-border px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-2"
            >
              Back to home
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
