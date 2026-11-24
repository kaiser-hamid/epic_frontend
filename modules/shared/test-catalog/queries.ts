"use client"

import { useQuery } from "@tanstack/react-query"

import { lookupTestItems } from "@/modules/shared/test-catalog/api"
import type { TestItemCategory } from "@/modules/shared/test-catalog/enums"

/** Backend limits: longer terms and more `exclude_ids` fail validation. */
const MAX_SEARCH_LENGTH = 100
const MAX_EXCLUDE_IDS = 200

export const testItemKeys = {
  all: ["shared", "test-items"] as const,
  lookups: () => [...testItemKeys.all, "lookup"] as const,
  lookup: (
    search: string,
    excludeIds: readonly number[],
    category: TestItemCategory | undefined
  ) =>
    [
      ...testItemKeys.lookups(),
      { search, exclude_ids: excludeIds, category },
    ] as const,
}

/**
 * Reference data: cached for a minute per term and exclusion set. `search` is the term
 * submitted with Enter; "" (nothing submitted) runs no request. `excludeIds` are the tests already picked on the form;
 * they are left out by the server and, in case the list was fetched before a pick,
 * filtered out here too. `category` narrows the list to one kind of item.
 */
export function useTestItemLookup(
  search: string,
  excludeIds: readonly number[],
  category?: TestItemCategory
) {
  const term = search.trim().slice(0, MAX_SEARCH_LENGTH)
  // Sorted and unique, so the same set always shares a cache entry. Ids past the
  // backend limit are only filtered here.
  const excluded = [...new Set(excludeIds)].sort((a, b) => a - b)
  const sent = excluded.slice(0, MAX_EXCLUDE_IDS)
  return useQuery({
    queryKey: testItemKeys.lookup(term, sent, category),
    queryFn: () => lookupTestItems(term, sent, category),
    enabled: term !== "",
    staleTime: 60_000,
    select: (items) => items.filter((item) => !excluded.includes(item.id)),
  })
}
