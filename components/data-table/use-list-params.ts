"use client"

import { parseAsInteger, parseAsString, useQueryStates } from "nuqs"
import { useCallback } from "react"

export const DEFAULT_PER_PAGE = 20

/**
 * Page, page size and sort for a server-side list, kept in the URL.
 * Filters are module-specific: keep them in their own `useQueryStates` and call
 * `resetPage()` whenever a filter changes. Give each list a `prefix` when one page
 * shows several (tabs), so their URL keys do not collide (`pending_page`).
 */
export function useListParams({
  defaultSort,
  prefix = "",
}: { defaultSort?: string; prefix?: string } = {}) {
  const [params, setParams] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      per_page: parseAsInteger.withDefault(DEFAULT_PER_PAGE),
      sort: defaultSort
        ? parseAsString.withDefault(defaultSort)
        : parseAsString,
    },
    {
      history: "replace",
      urlKeys: {
        page: `${prefix}page`,
        per_page: `${prefix}per_page`,
        sort: `${prefix}sort`,
      },
    }
  )

  // Scroll to the top so a page change is visible, not just the pager label.
  const setPage = useCallback(
    (page: number) => setParams({ page }, { scroll: true }),
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
