"use client";

import { useAPI } from "./use-api";
import type { Distributor, DistributorDashboard } from "@/lib/types";

export function useDistributor(id?: string) {
  return useAPI<Distributor>(id ? `/distributors/${id}` : null);
}

// Authenticated user's own distributor profile. SWR-deduped: safe to call
// from every page — a single /distributors/me request is shared.
export function useMyDistributor() {
  return useAPI<Distributor>("/distributors/me");
}

export function useDashboard(id?: string) {
  return useAPI<DistributorDashboard>(
    id ? `/distributors/${id}/dashboard` : null
  );
}
