"use client"

import { SearchIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs"
import { useEffect, useState } from "react"

import { dataTableColumnHelper } from "@/components/data-table/columns"
import { DataTable } from "@/components/data-table/data-table"
import { useListParams } from "@/components/data-table/use-list-params"
import { DateTime } from "@/components/date-time"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { CaseStatusBadge } from "@/modules/blood-bank/cases/components/case-status-badge"
import { useCases } from "@/modules/blood-bank/cases/queries"
import {
  caseSortableColumns,
  type BloodBankCase,
} from "@/modules/blood-bank/cases/types"
import {
  careTypeLabels,
  CaseStatus,
  caseStatusLabels,
} from "@/modules/blood-bank/enums"

const ALL = "all"

const helper = dataTableColumnHelper<BloodBankCase>()

const columns = helper.columns([
  helper.accessor("case_no", {
    header: "Case no",
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  }),
  helper.accessor((row) => row.patient?.name ?? "—", {
    id: "patient",
    header: "Patient",
  }),
  helper.accessor("care_type", {
    header: "Care of",
    cell: (info) => careTypeLabels[info.getValue()],
  }),
  helper.accessor("status", {
    header: "Status",
    cell: (info) => <CaseStatusBadge status={info.getValue()} />,
  }),
  helper.accessor("created_at", {
    header: "Opened",
    cell: (info) => <DateTime value={info.getValue()} />,
  }),
])

export function CaseTable() {
  const router = useRouter()
  const { page, perPage, sort, setPage, setSort, resetPage } = useListParams({
    defaultSort: "-created_at",
  })
  const [filters, setFilters] = useQueryStates(
    {
      status: parseAsStringLiteral(Object.values(CaseStatus)),
      search: parseAsString,
    },
    { history: "replace" }
  )

  const [searchInput, setSearchInput] = useState(filters.search ?? "")
  const debouncedSearch = useDebouncedValue(searchInput)

  useEffect(() => {
    const next = debouncedSearch.trim() || null
    if (next !== filters.search) {
      setFilters({ search: next })
      resetPage()
    }
  }, [debouncedSearch, filters.search, setFilters, resetPage])

  const query = useCases({
    filter: { status: filters.status, search: filters.search },
    sort,
    page,
    per_page: perPage,
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <InputGroup className="sm:max-w-xs">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Case no, patient, invoice"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </InputGroup>
        <Select
          value={filters.status ?? ALL}
          onValueChange={(value) => {
            setFilters({ status: value === ALL ? null : (value as CaseStatus) })
            resetPage()
          }}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {Object.values(CaseStatus).map((status) => (
              <SelectItem key={status} value={status}>
                {caseStatusLabels[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={query.data?.data}
        meta={query.data?.meta}
        isLoading={query.isPending}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => query.refetch()}
        sort={sort}
        onSortChange={setSort}
        sortableColumns={caseSortableColumns}
        onPageChange={setPage}
        getRowId={(row) => String(row.id)}
        onRowClick={(row) => router.push(`/blood-bank/cases/${row.id}`)}
        emptyTitle="No cases"
      />
    </div>
  )
}
