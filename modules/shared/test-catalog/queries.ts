"use client"

import { useQuery } from "@tanstack/react-query"

import { LOOKUP_MIN_LENGTH } from "@/hooks/use-lookup-term"
import { lookupTestItems } from "@/modules/shared/test-catalog/api"

/** Backend limits: longer terms and more `exclude_ids` fail validation. */
const MAX_SEARCH_LENGTH = 100
const MAX_EXCLUDE_IDS = 200

export const testItemKeys = {
  all: ["shared", "test-items"] as const,
  lookups: () => [...testItemKeys.all, "lookup"] as const,
  lookup: (search: string, excludeIds: readonly number[]) =>
    [...testItemKeys.lookups(), { search, exclude_ids: excludeIds }] as const,
}

/**
 * Reference data: cached for a minute per term and exclusion set. Disabled below
 * `LOOKUP_MIN_LENGTH` characters. `excludeIds` are the tests already picked on the form;
 * they are left out by the server and, in case the list was fetched before a pick,
 * filtered out here too.
 */
export function useTestItemLookup(
  search: string,
  excludeIds: readonly number[]
) {
  const term = search.trim().slice(0, MAX_SEARCH_LENGTH)
  // Sorted and unique, so the same set always shares a cache entry. Ids past the
  // backend limit are only filtered here.
  const excluded = [...new Set(excludeIds)].sort((a, b) => a - b)
  const sent = excluded.slice(0, MAX_EXCLUDE_IDS)
  return useQuery({
    queryKey: testItemKeys.lookup(term, sent),
    queryFn: () => lookupTestItems(term, sent),
    enabled: term.length >= LOOKUP_MIN_LENGTH,
    staleTime: 60_000,
    select: (items) => items.filter((item) => !excluded.includes(item.id)),
  })
}
