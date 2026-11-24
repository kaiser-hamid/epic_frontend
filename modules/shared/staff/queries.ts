"use client"

import { useQuery } from "@tanstack/react-query"

import { lookupStaff } from "@/modules/shared/staff/api"

export const staffKeys = {
  all: ["shared", "staff"] as const,
  lookups: () => [...staffKeys.all, "lookup"] as const,
  lookup: (search: string) => [...staffKeys.lookups(), search] as const,
}

/** Reference data: cached for a minute per term. `search` is submitted with Enter; "" runs no request. */
export function useStaffLookup(search: string) {
  const term = search.trim()
  return useQuery({
    queryKey: staffKeys.lookup(term),
    queryFn: () => lookupStaff(term),
    enabled: term !== "",
    staleTime: 60_000,
  })
}
