"use client"

import { useQuery } from "@tanstack/react-query"

import { LOOKUP_MIN_LENGTH } from "@/hooks/use-lookup-term"
import { lookupDoctors } from "@/modules/shared/doctor/api"

export const doctorKeys = {
  all: ["shared", "doctors"] as const,
  lookups: () => [...doctorKeys.all, "lookup"] as const,
  lookup: (search: string) => [...doctorKeys.lookups(), search] as const,
}

/** Reference data: cached for a minute per term. Disabled below `LOOKUP_MIN_LENGTH` characters. */
export function useDoctorLookup(search: string) {
  const term = search.trim()
  return useQuery({
    queryKey: doctorKeys.lookup(term),
    queryFn: () => lookupDoctors(term),
    enabled: term.length >= LOOKUP_MIN_LENGTH,
    staleTime: 60_000,
  })
}
