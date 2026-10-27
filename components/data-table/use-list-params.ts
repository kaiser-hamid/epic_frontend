"use client"

import { parseAsInteger, parseAsString, useQueryStates } from "nuqs"
import { useCallback } from "react"

export const DEFAULT_PER_PAGE = 20

/**
 * Page, page size and sort for a server-side list, kept in the URL.
 * Filters are module-specific: keep them in their own `useQueryStates` and call
 * `resetPage()` whenever a filter changes.
 */
export function useListParams({ defaultSort }: { defaultSort?: string } = {}) {
  const [params, setParams] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      per_page: parseAsInteger.withDefault(DEFAULT_PER_PAGE),
      sort: defaultSort
        ? parseAsString.withDefault(defaultSort)
        : parseAsString,
    },
    { history: "replace" }
  )

  const setPage = useCallback(
    (page: number) => setParams({ page }),
    [setParams]
  )
  const setSort = useCallback(
    (sort: string | null) => setParams({ sort, page: 1 }),
    [setParams]
  )
  const resetPage = useCallback(() => setParams({ page: 1 }), [setParams])

  return {
    page: params.page,
    perPage: params.per_page,
    sort: params.sort,
    setPage,
    setSort,
    resetPage,
  }
}
