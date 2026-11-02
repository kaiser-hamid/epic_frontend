"use client"

import { useQuery } from "@tanstack/react-query"

import { listStorageLocations } from "@/modules/blood-bank/storage-locations/api"

export const storageLocationKeys = {
  all: ["blood-bank", "storage-locations"] as const,
  list: () => [...storageLocationKeys.all, "list"] as const,
}

/** Rarely changes: fetched once per session (login and logout clear the cache). */
export function useStorageLocations() {
  return useQuery({
    queryKey: storageLocationKeys.list(),
    queryFn: listStorageLocations,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
