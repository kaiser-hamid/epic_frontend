"use client"

import { SearchIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { parseAsString, useQueryStates } from "nuqs"
import { useEffect, useState } from "react"

import { dataTableColumnHelper } from "@/components/data-table/columns"
import { DataTable } from "@/components/data-table/data-table"
import { useListParams } from "@/components/data-table/use-list-params"
import { Badge } from "@/components/ui/badge"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { designationLabel } from "@/modules/shared/auth/enums"
import { useUserAccessList } from "@/modules/user-management/permissions/queries"
import type {
  BranchAccess,
  UserAccess,
} from "@/modules/user-management/permissions/types"

const helper = dataTableColumnHelper<UserAccess>()

/** `Cashier, BB Tech (+2)`; `5 custom` when no template matches. */
function branchSummary(access: BranchAccess): string {
  if (access.matched_roles.length === 0) {
    return `${access.permission_count} custom`
  }
  const roles = access.matched_roles.map((role) => role.name).join(", ")
  return access.other_permission_count > 0
    ? `${roles} (+${access.other_permission_count})`
    : roles
}

function AccessCell({ user }: { user: UserAccess }) {
  if (user.is_super_admin) {
    return <Badge variant="info">Super admin · every branch</Badge>
  }
  if (user.branches.length === 0) {
    return <span className="text-muted-foreground">—</span>
  }
  return (
    <ul className="flex flex-col gap-0.5">
      {user.branches.map((access) => (
        <li key={access.branch.id}>
          <span className="font-medium">{access.branch.name}:</span>{" "}
          <span className="text-muted-foreground">{branchSummary(access)}</span>
        </li>
      ))}
    </ul>
  )
}

const columns = helper.columns([
  helper.accessor("employee_id", { header: "ID" }),
  helper.accessor("name", {
    header: "Name",
    cell: ({ row }) => (
      <span className="flex flex-col">
        <span className="font-medium">{row.original.name}</span>
        <span className="text-xs text-muted-foreground">
          {row.original.username}
          {row.original.is_active ? null : " · Disabled"}
        </span>
      </span>
    ),
  }),
  helper.accessor("designation", {
    header: "Designation",
    cell: (info) => designationLabel(info.getValue()) ?? "—",
  }),
  helper.accessor("permission_count", {
    header: "Permissions",
    cell: ({ row }) =>
      row.original.is_super_admin ? "All" : row.original.permission_count,
  }),
  helper.display({
    id: "access",
    header: "Access",
    cell: ({ row }) => <AccessCell user={row.original} />,
  }),
])

/** Who holds what, by name. Search covers employee id, name and username; a row opens the user's grants. */
export function UserAccessTable() {
  const router = useRouter()
  const { page, perPage, setPage, resetPage } = useListParams()
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

  const query = useUserAccessList({
    filter: { search: filters.search },
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
          placeholder="ID, name or username"
          aria-label="Search users"
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
        onPageChange={setPage}
        getRowId={(row) => String(row.id)}
        onRowClick={(row) =>
          router.push(`/user-management/permissions/${row.id}`)
        }
        emptyTitle="No users found"
      />
    </div>
  )
}
