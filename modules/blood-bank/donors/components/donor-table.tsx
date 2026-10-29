"use client"

import { SearchIcon } from "lucide-react"
import { parseAsString, useQueryStates } from "nuqs"
import { useEffect, useState } from "react"

import { dataTableColumnHelper } from "@/components/data-table/columns"
import { DataTable } from "@/components/data-table/data-table"
import { RowActions, ViewRowAction } from "@/components/data-table/row-actions"
import { useListParams } from "@/components/data-table/use-list-params"
import { DateTime } from "@/components/date-time"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { useDonors } from "@/modules/blood-bank/donors/queries"
import {
  donorSortableColumns,
  type Donor,
} from "@/modules/blood-bank/donors/types"
import { bloodGroupLabels, genderLabels } from "@/modules/shared/patient/enums"

const helper = dataTableColumnHelper<Donor>()

const columns = helper.columns([
  helper.accessor("donor_no", {
    header: "Donor no",
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  }),
  helper.accessor("name", { header: "Name" }),
  helper.accessor("age", {
    header: "Age",
    cell: (info) => info.getValue() ?? "—",
  }),
  helper.accessor("gender", {
    header: "Gender",
    cell: (info) => {
      const gender = info.getValue()
      return gender ? genderLabels[gender] : "—"
    },
  }),
  helper.accessor("blood_group", {
    header: "Blood group",
    cell: (info) => {
      const group = info.getValue()
      return group ? bloodGroupLabels[group] : "—"
    },
  }),
  helper.accessor("phone", {
    header: "Phone",
    cell: (info) => info.getValue() ?? "—",
  }),
  helper.accessor("is_regular_volunteer", {
    header: "Regular volunteer",
    cell: (info) => {
      const value = info.getValue()
      return value === null ? "" : value ? "Yes" : "No"
    },
  }),
  helper.accessor("created_at", {
    header: "Registered",
    cell: (info) => <DateTime value={info.getValue()} />,
  }),
  helper.display({
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => (
      <RowActions label={row.original.donor_no}>
        <ViewRowAction href={`/blood-bank/donors/${row.original.id}`} />
      </RowActions>
    ),
  }),
])

export function DonorTable() {
  const { page, perPage, sort, setPage, setSort, resetPage } = useListParams({
    defaultSort: "-created_at",
  })
  const [filters, setFilters] = useQueryStates(
    { search: parseAsString },
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

  const query = useDonors({
    filter: { search: filters.search },
    sort,
    page,
    per_page: perPage,
  })

  return (
    <div className="flex flex-col gap-4">
      <InputGroup className="sm:max-w-xs">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          placeholder="Search by donor no, name or phone"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
      </InputGroup>

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
        sortableColumns={donorSortableColumns}
        onPageChange={setPage}
        getRowId={(row) => String(row.id)}
        emptyTitle="No donors found"
      />
    </div>
  )
}
