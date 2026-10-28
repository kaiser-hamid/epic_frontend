"use client"

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { PaginationMeta } from "@/lib/api-types"

/** Previous / Next for a server-side list. `onPageChange` receives the one-based `page` param. */
export function DataTablePagination({
  meta,
  onPageChange,
}: {
  meta: PaginationMeta
  onPageChange: (page: number) => void
}) {
  const { page_index, page_size, page_count, row_count } = meta
  const currentPage = page_index + 1
  const from = page_index * page_size + 1
  const to = Math.min(from + page_size - 1, row_count)

  return (
    <div className="flex flex-col items-center justify-between gap-2 text-sm text-muted-foreground sm:flex-row">
      <p className="tabular-nums">
        {row_count === 0
          ? "No results"
          : `Showing ${from}–${to} of ${row_count}`}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page_index <= 0}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeftIcon data-icon="inline-start" />
          Previous
        </Button>
        <span className="tabular-nums">
          Page {currentPage} of {Math.max(page_count, 1)}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page_index >= page_count - 1}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
          <ChevronRightIcon data-icon="inline-end" />
        </Button>
      </div>
    </div>
  )
}
