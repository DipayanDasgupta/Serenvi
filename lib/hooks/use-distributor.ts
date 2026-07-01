"use client";

import { useAPI } from "./use-api";
import type { Distributor, DistributorDashboard } from "@/lib/types";

export function useDistributor(id?: string) {
  return useAPI<Distributor>(id ? `/distributors/${id}` : null);
}

export function useDashboard(id?: string) {
  return useAPI<DistributorDashboard>(
    id ? `/distributors/${id}/dashboard` : null
  );
}
