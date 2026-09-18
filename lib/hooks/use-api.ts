"use client";

import useSWR, { SWRConfiguration } from "swr";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api-client";

const BACKEND_TOKEN_KEY = "serenvi_backend_jwt";

export function clearBackendToken() {
  try {
    localStorage.removeItem(BACKEND_TOKEN_KEY);
  } catch {
    // storage unavailable (private mode) — token just won't persist
  }
}

// The backend speaks its own HS256 JWTs, not Clerk session tokens.
// Swap the Clerk token for a backend token once, then cache it.
async function exchangeForBackendToken(clerkToken: string): Promise<string | undefined> {
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
      localStorage.setItem(BACKEND_TOKEN_KEY, token);
    } catch {
      // ignore persistence failures
    }
    return token;
  }
  return undefined;
}

export function useAPI<T>(
  endpoint: string | null,
  config?: SWRConfiguration
) {
  const { getToken, isSignedIn } = useAuth();

  const fetcher = async (url: string) => {
    const token = await resolveBackendToken(
      () => getToken().catch(() => null),
      isSignedIn ?? false
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

  return useSWR<T>(endpoint, fetcher, {
    revalidateOnFocus: false,
    ...config,
  });
}

async function resolveBackendToken(
  getClerkToken: () => Promise<string | null>,
  signedIn: boolean
): Promise<string | undefined> {
  try {
    const cached = localStorage.getItem(BACKEND_TOKEN_KEY);
    if (cached) return cached;
  } catch {
    // ignore storage failures
  }
  if (!signedIn) return undefined;
  const clerkToken = await getClerkToken();
  if (!clerkToken) return undefined;
  return await exchangeForBackendToken(clerkToken);
}

export function useAuthToken() {
  const { getToken, isSignedIn } = useAuth();

  return async () => {
    return await resolveBackendToken(
      () => getToken().catch(() => null),
      isSignedIn ?? false
    );
  };
}
