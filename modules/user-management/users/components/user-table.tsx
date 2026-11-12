"use client"

import { SearchIcon } from "lucide-react"
import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs"
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
import { designationLabel } from "@/modules/shared/auth/enums"
import { UserRowActions } from "@/modules/user-management/users/components/user-actions"
import { UserAvatar } from "@/modules/user-management/users/components/user-avatar"
import { UserStatusBadges } from "@/modules/user-management/users/components/user-status-badge"
import { useUsers } from "@/modules/user-management/users/queries"
import type { User } from "@/modules/user-management/users/types"

const helper = dataTableColumnHelper<User>()

const columns = helper.columns([
  helper.accessor("name", {
    header: "Name",
    cell: (info) => (
      <span className="flex items-center gap-2">
        <UserAvatar size="sm" />
        <span className="font-medium">{info.getValue()}</span>
      </span>
    ),
  }),
  helper.accessor("username", { header: "Username" }),
  helper.accessor("employee_id", { header: "Employee ID" }),
  helper.accessor("designation", {
    header: "Designation",
    cell: (info) => designationLabel(info.getValue()) ?? "—",
  }),
  helper.accessor("is_active", {
    header: "Status",
    cell: ({ row }) => <UserStatusBadges user={row.original} />,
  }),
  helper.accessor("last_login_at", {
    header: "Last sign-in",
    cell: (info) => <DateTime value={info.getValue()} />,
  }),
  helper.display({
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => <UserRowActions user={row.original} />,
  }),
])

const ALL = "all"
const ACTIVE = "active"
const DISABLED = "disabled"

/** All staff accounts, by name. Search covers name, username and employee id. */
export function UserTable() {
  const { page, perPage, setPage, resetPage } = useListParams()
  const [filters, setFilters] = useQueryStates(
    { search: parseAsString, active: parseAsBoolean },
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

  const query = useUsers({
    filter: { search: filters.search, is_active: filters.active },
    page,
    per_page: perPage,
  })

  const statusValue =
    filters.active === null ? ALL : filters.active ? ACTIVE : DISABLED

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <InputGroup className="sm:max-w-xs">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Name, username or employee ID"
            aria-label="Search users"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </InputGroup>
        <Select
          value={statusValue}
          onValueChange={(value) => {
            setFilters({ active: value === ALL ? null : value === ACTIVE })
            resetPage()
          }}
        >
          <SelectTrigger className="sm:w-40" aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            <SelectItem value={ACTIVE}>Active</SelectItem>
            <SelectItem value={DISABLED}>Disabled</SelectItem>
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
        onPageChange={setPage}
        getRowId={(row) => String(row.id)}
        emptyTitle="No users found"
      />
    </div>
  )
}
