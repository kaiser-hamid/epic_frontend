"use client"

import { useQuery } from "@tanstack/react-query"

import { LOOKUP_MIN_LENGTH } from "@/hooks/use-lookup-term"
import { lookupStaff } from "@/modules/shared/staff/api"

export const staffKeys = {
  all: ["shared", "staff"] as const,
  lookups: () => [...staffKeys.all, "lookup"] as const,
  lookup: (search: string) => [...staffKeys.lookups(), search] as const,
}

/** Reference data: cached for a minute per term. Disabled below `LOOKUP_MIN_LENGTH` characters. */
export function useStaffLookup(search: string) {
  const term = search.trim()
  return useQuery({
    queryKey: staffKeys.lookup(term),
    queryFn: () => lookupStaff(term),
    enabled: term.length >= LOOKUP_MIN_LENGTH,
    staleTime: 60_000,
  })
}
