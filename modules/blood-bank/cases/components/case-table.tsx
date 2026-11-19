"use client"

import { ReceiptTextIcon, SearchIcon } from "lucide-react"
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs"
import { useEffect, useRef, useState } from "react"

import { dataTableColumnHelper } from "@/components/data-table/columns"
import { DataTable } from "@/components/data-table/data-table"
import { RowActions, ViewRowAction } from "@/components/data-table/row-actions"
import { useListParams } from "@/components/data-table/use-list-params"
import { DateTime } from "@/components/date-time"
import { Money } from "@/components/money"
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
  CareType,
  careTypeLabels,
  CaseService,
  caseServiceLabels,
  CaseStatus,
  caseStatusLabels,
} from "@/modules/blood-bank/enums"

const ALL = "all"

/** Open cases that never close by themselves (only services billed); closed by hand. */
const NEEDS_CLOSING = "needs_closing"

const serviceFilterValues = [
  ...Object.values(CaseService),
  NEEDS_CLOSING,
] as const

const helper = dataTableColumnHelper<BloodBankCase>()

const columns = helper.columns([
  helper.accessor("case_no", {
    header: "Case no",
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  }),
  helper.display({
    id: "patient",
    header: "Patient",
    cell: ({ row }) => {
      const patient = row.original.patient
      if (!patient) {
        return "—"
      }
      return (
        <div className="flex flex-col">
          <span>{patient.name}</span>
          <span className="text-xs text-muted-foreground">
            {[patient.patient_no, patient.phone].filter(Boolean).join(" · ")}
          </span>
        </div>
      )
    },
  }),
  helper.accessor("care_type", {
    header: "Care of",
    cell: (info) => careTypeLabels[info.getValue()],
  }),
  helper.display({
    id: "components",
    header: "Components",
    cell: ({ row }) =>
      row.original.service !== CaseService.Transfusion
        ? caseServiceLabels[row.original.service]
        : row.original.components.length === 0
          ? "Services only"
          : row.original.components
              .map((line) => `${line.code} × ${line.quantity}`)
              .join(", "),
  }),
  helper.accessor("donors_count", {
    header: "Donors",
    cell: (info) => <span className="tabular-nums">{info.getValue()}</span>,
  }),
  helper.display({
    id: "invoice",
    header: "Invoice",
    cell: ({ row }) => {
      const invoice = row.original.invoice
      if (!invoice) {
        return "—"
      }
      return (
        <div className="flex flex-col">
          <span>{invoice.invoice_no}</span>
          <Money
            paisa={invoice.amount}
            className="text-xs text-muted-foreground"
          />
        </div>
      )
    },
  }),
  helper.accessor("status", {
    header: "Status",
    cell: (info) => <CaseStatusBadge status={info.getValue()} />,
  }),
  helper.accessor("created_at", {
    header: "Registered",
    cell: (info) => <DateTime value={info.getValue()} />,
  }),
  helper.display({
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => (
      <RowActions label={row.original.case_no}>
        <ViewRowAction href={`/blood-bank/cases/${row.original.id}`} />
      </RowActions>
    ),
  }),
])

export function CaseTable() {
  const { page, perPage, sort, setPage, setSort, resetPage } = useListParams({
    defaultSort: "-created_at",
  })
  const [filters, setFilters] = useQueryStates(
    {
      invoice_no: parseAsString,
      search: parseAsString,
      status: parseAsStringLiteral(Object.values(CaseStatus)),
      care_type: parseAsStringLiteral(Object.values(CareType)),
      service: parseAsStringLiteral(serviceFilterValues),
    },
    { history: "replace" }
  )

  const invoiceRef = useRef<HTMLInputElement>(null)
  const [invoiceInput, setInvoiceInput] = useState(filters.invoice_no ?? "")

  // `autoFocus` alone is unreliable here (the page mounts behind the permission gate and
  // Suspense), so focus the invoice input explicitly on mount.
  useEffect(() => {
    invoiceRef.current?.focus()
  }, [])

  function applyInvoiceFilter() {
    setFilters({ invoice_no: invoiceInput.trim() || null })
    resetPage()
  }

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
    filter: {
      invoice_no: filters.invoice_no,
      search: filters.search,
      status: filters.status,
      care_type: filters.care_type,
      service: filters.service === NEEDS_CLOSING ? null : filters.service,
      needs_closing: filters.service === NEEDS_CLOSING ? "1" : null,
    },
    sort,
    page,
    per_page: perPage,
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <InputGroup className="sm:max-w-48">
          <InputGroupAddon>
            <ReceiptTextIcon />
          </InputGroupAddon>
          <InputGroupInput
            ref={invoiceRef}
            placeholder="Invoice no"
            aria-label="Invoice no"
            value={invoiceInput}
            onChange={(event) => setInvoiceInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                applyInvoiceFilter()
              }
            }}
          />
        </InputGroup>
        <InputGroup className="sm:max-w-xs">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Patient name, phone or number"
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
          <SelectTrigger className="sm:w-40" aria-label="Status">
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
        <Select
          value={filters.care_type ?? ALL}
          onValueChange={(value) => {
            setFilters({
              care_type: value === ALL ? null : (value as CareType),
            })
            resetPage()
          }}
        >
          <SelectTrigger className="sm:w-40" aria-label="Care of">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All care types</SelectItem>
            {Object.values(CareType).map((careType) => (
              <SelectItem key={careType} value={careType}>
                {careTypeLabels[careType]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.service ?? ALL}
          onValueChange={(value) => {
            setFilters({
              service:
                value === ALL
                  ? null
                  : (value as (typeof serviceFilterValues)[number]),
            })
            resetPage()
          }}
        >
          <SelectTrigger className="sm:w-52" aria-label="Service">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All services</SelectItem>
            {Object.values(CaseService).map((service) => (
              <SelectItem key={service} value={service}>
                {caseServiceLabels[service]}
              </SelectItem>
            ))}
            <SelectItem value={NEEDS_CLOSING}>Open · needs closing</SelectItem>
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
        emptyTitle="No cases"
      />
    </div>
  )
}
