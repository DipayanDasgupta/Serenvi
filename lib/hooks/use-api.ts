"use client";

import useSWR, { SWRConfiguration } from "swr";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api-client";

export function useAPI<T>(
  endpoint: string | null,
  config?: SWRConfiguration
) {
  const { getToken } = useAuth();

  const fetcher = async (url: string) => {
    const token = await getToken();
    return api.get<T>(url, token || undefined);
  };

  return useSWR<T>(endpoint, fetcher, {
    revalidateOnFocus: false,
    ...config,
  });
}

export function useAuthToken() {
  const { getToken } = useAuth();

  return async () => {
    const token = await getToken();
    return token || undefined;
  };
}
