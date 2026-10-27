"use client"

import { useQuery } from "@tanstack/react-query"

import { listActiveComponentTypes } from "@/modules/blood-bank/component-types/api"

export const componentTypeKeys = {
  all: ["blood-bank", "component-types"] as const,
  active: () => [...componentTypeKeys.all, "active"] as const,
}

/** Master data changes rarely; cached for the session. */
export function useActiveComponentTypes() {
  return useQuery({
    queryKey: componentTypeKeys.active(),
    queryFn: listActiveComponentTypes,
    staleTime: 10 * 60_000,
  })
}
