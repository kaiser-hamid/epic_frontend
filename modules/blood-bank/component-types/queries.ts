"use client"

import { useQuery } from "@tanstack/react-query"

import { listComponentTypes } from "@/modules/blood-bank/component-types/api"

export const componentTypeKeys = {
  all: ["blood-bank", "component-types"] as const,
  list: () => [...componentTypeKeys.all, "list"] as const,
}

/** Rarely changes: fetched once per session (login and logout clear the cache). */
export function useComponentTypes() {
  return useQuery({
    queryKey: componentTypeKeys.list(),
    queryFn: listComponentTypes,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
