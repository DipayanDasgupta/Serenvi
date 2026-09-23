"use client";

import useSWR, { SWRConfiguration } from "swr";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api-client";

const LEGACY_TOKEN_KEY = "serenvi_backend_jwt";
const TOKEN_KEY_PREFIX = "serenvi_backend_jwt:";

// One cache slot per Clerk user. A single global slot leaks identity across
// accounts on shared browsers (user B silently reuses user A's backend JWT).
function tokenKey(clerkUserId: string | null | undefined) {
  return `${TOKEN_KEY_PREFIX}${clerkUserId || "anon"}`;
}

export function clearBackendToken() {
  try {
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(TOKEN_KEY_PREFIX)) doomed.push(k);
    }
    doomed.forEach((k) => localStorage.removeItem(k));
  } catch {
    // storage unavailable (private mode) — token just won't persist
  }
}

// The backend speaks its own HS256 JWTs, not Clerk session tokens.
// Swap the Clerk token for a backend token once, then cache it.
async function exchangeForBackendToken(
  clerkToken: string,
  clerkUserId: string | null | undefined
): Promise<string | undefined> {
  const res = await fetch("/api/auth/clerk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clerkToken }),
  });
  if (!res.ok) return undefined;
  const data = await res.json().catch(() => null);
  const token = data?.access_token;
  if (typeof token === "string" && token) {
    try {
      // Drop any legacy global token: it may belong to a different account.
      localStorage.removeItem(LEGACY_TOKEN_KEY);
      localStorage.setItem(tokenKey(clerkUserId), token);
    } catch {
      // ignore persistence failures
    }
    // Brand-new account (just provisioned): collect the sponsor's referral
    // code before entering the app. Runs once — subsequent exchanges return
    // isNewDistributor: false.
    if (
      data?.isNewDistributor === true &&
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/onboarding")
    ) {
      window.location.href = "/onboarding";
    }
    return token;
  }
  return undefined;
}

export function useAPI<T>(
  endpoint: string | null,
  config?: SWRConfiguration
) {
  const { getToken, isSignedIn, userId } = useAuth();

  // SWR key includes the Clerk user so cached responses never bleed across
  // accounts on a shared browser.
  const key = endpoint ? [endpoint, userId ?? "anon"] : null;

  const fetcher = async ([url]: [string]) => {
    const token = await resolveBackendToken(
      () => getToken().catch(() => null),
      isSignedIn ?? false,
      userId
    );
    try {
      return await api.get<T>(url, token);
    } catch (error) {
      // Backend token expired/revoked → drop cache so the next call re-exchanges.
      if (error instanceof Error && /401|Unauthorized/i.test(error.message)) {
        clearBackendToken();
      }
      throw error;
    }
  };

  return useSWR<T>(key, fetcher, {
    revalidateOnFocus: false,
    ...config,
  });
}

async function resolveBackendToken(
  getClerkToken: () => Promise<string | null>,
  signedIn: boolean,
  clerkUserId: string | null | undefined
): Promise<string | undefined> {
  try {
    // Legacy global slot is untrusted (may hold another account's token).
    if (localStorage.getItem(LEGACY_TOKEN_KEY)) {
      localStorage.removeItem(LEGACY_TOKEN_KEY);
    } else {
      const cached = localStorage.getItem(tokenKey(clerkUserId));
      if (cached) return cached;
    }
  } catch {
    // ignore storage failures
  }
  if (!signedIn) return undefined;
  const clerkToken = await getClerkToken();
  if (!clerkToken) return undefined;
  return await exchangeForBackendToken(clerkToken, clerkUserId);
}

// Predicate for global `mutate`: SWR keys are [endpoint, clerkUserId] tuples.
export function matchKey(prefix: string) {
  return (key: unknown) =>
    Array.isArray(key) &&
    typeof key[0] === "string" &&
    (key[0] as string).startsWith(prefix);
}

export function useAuthToken() {
  const { getToken, isSignedIn, userId } = useAuth();

  return async () => {
    return await resolveBackendToken(
      () => getToken().catch(() => null),
      isSignedIn ?? false,
      userId
    );
  };
}
