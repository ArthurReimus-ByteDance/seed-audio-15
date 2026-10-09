"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchStatus } from "@/lib/api/seed-audio";

export function useServiceStatus() {
  return useQuery({
    queryKey: ["service-status"],
    queryFn: fetchStatus,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });
}
