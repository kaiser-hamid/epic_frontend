"use client"

import { useQuery } from "@tanstack/react-query"

import { lookupDoctors } from "@/modules/shared/doctor/api"

export const doctorKeys = {
  all: ["shared", "doctors"] as const,
  lookups: () => [...doctorKeys.all, "lookup"] as const,
  lookup: (search: string) => [...doctorKeys.lookups(), search] as const,
}

/** Reference data: cached for a minute per term. `search` is submitted with Enter; "" runs no request. */
export function useDoctorLookup(search: string) {
  const term = search.trim()
  return useQuery({
    queryKey: doctorKeys.lookup(term),
    queryFn: () => lookupDoctors(term),
    enabled: term !== "",
    staleTime: 60_000,
  })
}
