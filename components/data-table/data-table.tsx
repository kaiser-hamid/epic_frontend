"use client"

import { useTable, type RowData } from "@tanstack/react-table"
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  InboxIcon,
} from "lucide-react"

import {
  dataTableFeatures,
  type DataTableColumns,
} from "@/components/data-table/columns"
import { DataTablePagination } from "@/components/data-table/data-table-pagination"
import { QueryError } from "@/components/query-error"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { PaginationMeta } from "@/lib/api-types"
import { cn } from "@/lib/utils"

const noRows: never[] = []

type DataTableProps<TData extends RowData> = {
  columns: DataTableColumns<TData>
  data: TData[] | undefined
  meta?: PaginationMeta
  isLoading: boolean
  isFetching?: boolean
  error?: unknown
  onRetry?: () => void
  /** Current `sort` param, e.g. `-created_at`. */
  sort?: string | null
  onSortChange?: (sort: string | null) => void
  /** Column ids the backend allows sorting by (column id = API sort field). */
  sortableColumns?: readonly string[]
  onPageChange?: (page: number) => void
  getRowId?: (row: TData) => string
  /** Makes rows clickable (and focusable: Enter or Space opens them too). */
  onRowClick?: (row: TData) => void
  emptyTitle?: string
  emptyDescription?: string
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  meta,
  isLoading,
  isFetching = false,
  error,
  onRetry,
  sort,
  onSortChange,
  sortableColumns = [],
  onPageChange,
  getRowId,
  onRowClick,
  emptyTitle = "No records",
  emptyDescription = "Nothing matches the current filters.",
}: DataTableProps<TData>) {
  const table = useTable({
    features: dataTableFeatures,
    columns,
    data: data ?? (noRows as TData[]),
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
  })

  if (error && !data) {
    return <QueryError error={error} onRetry={onRetry} />
  }

  const columnCount = table.getAllLeafColumns().length
  const rows = table.getRowModel().rows

  return (
    <div className="flex flex-col gap-3">
      <div
        className={cn(
          "overflow-hidden rounded-lg border transition-opacity",
          isFetching && !isLoading && "opacity-60"
        )}
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : sortableColumns.includes(
                        header.column.id
                      ) && onSortChange ? (
                      <SortButton
                        field={header.column.id}
                        sort={sort}
                        onSortChange={onSortChange}
                      >
                        <table.FlexRender header={header} />
                      </SortButton>
                    ) : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }, (_, index) => (
                <TableRow key={index}>
                  {Array.from({ length: columnCount }, (_, cellIndex) => (
                    <TableCell key={cellIndex}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnCount}>
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <InboxIcon />
                      </EmptyMedia>
                      <EmptyTitle>{emptyTitle}</EmptyTitle>
                      <EmptyDescription>{emptyDescription}</EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  {...(onRowClick
                    ? {
                        tabIndex: 0,
                        className: "cursor-pointer",
                        onClick: () => onRowClick(row.original),
                        onKeyDown: (event: React.KeyboardEvent) => {
                          if (
                            event.target === event.currentTarget &&
                            (event.key === "Enter" || event.key === " ")
                          ) {
                            event.preventDefault()
                            onRowClick(row.original)
                          }
                        },
                      }
                    : {})}
                >
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {meta && onPageChange ? (
        <DataTablePagination meta={meta} onPageChange={onPageChange} />
      ) : null}
    </div>
  )
}

function SortButton({
  field,
  sort,
  onSortChange,
  children,
}: {
  field: string
  sort: string | null | undefined
  onSortChange: (sort: string | null) => void
  children: React.ReactNode
}) {
  const direction =
    sort === field ? "asc" : sort === `-${field}` ? "desc" : null
  const Icon =
    direction === "asc"
      ? ArrowUpIcon
      : direction === "desc"
        ? ArrowDownIcon
        : ArrowUpDownIcon

  // asc → desc → unsorted (server default)
  const next =
    direction === null ? field : direction === "asc" ? `-${field}` : null

  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2"
      onClick={() => onSortChange(next)}
    >
      {children}
      <Icon data-icon="inline-end" className="text-muted-foreground" />
    </Button>
  )
}
