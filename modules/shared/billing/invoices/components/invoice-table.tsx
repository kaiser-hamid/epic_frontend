"use client"

import { SearchIcon } from "lucide-react"
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs"
import { useEffect, useState } from "react"

import { dataTableColumnHelper } from "@/components/data-table/columns"
import { DataTable } from "@/components/data-table/data-table"
import { useListParams } from "@/components/data-table/use-list-params"
import { DateTime } from "@/components/date-time"
import { Money } from "@/components/money"
import { Badge } from "@/components/ui/badge"
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
import {
  BillingStatus,
  billingStatusLabels,
} from "@/modules/shared/billing/enums"
import { InvoiceRowActions } from "@/modules/shared/billing/invoices/components/invoice-print-actions"
import { useInvoices } from "@/modules/shared/billing/invoices/queries"
import {
  invoiceSortableColumns,
  type Invoice,
} from "@/modules/shared/billing/invoices/types"
import {
  TestItemCategory,
  testItemCategoryLabels,
} from "@/modules/shared/test-catalog/enums"

const ALL = "all"

const helper = dataTableColumnHelper<Invoice>()

const columns = helper.columns([
  helper.accessor("invoice_no", {
    header: "Invoice no",
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
  helper.accessor("category", {
    header: "Type",
    cell: (info) =>
      info.getValue() === TestItemCategory.BloodBank ? (
        <Badge variant="secondary">{testItemCategoryLabels.blood_bank}</Badge>
      ) : (
        testItemCategoryLabels.general
      ),
  }),
  helper.display({
    id: "patient_type",
    header: "Patient type",
    cell: ({ row }) => row.original.patient_type?.name ?? "—",
  }),
  helper.accessor("amount", {
    header: () => <span className="block text-right">Payable</span>,
    cell: (info) => (
      <Money paisa={info.getValue()} className="block text-right" />
    ),
  }),
  helper.accessor("due_amount", {
    header: () => <span className="block text-right">Due</span>,
    cell: (info) =>
      info.getValue() === 0 ? (
        <span className="block text-right text-muted-foreground">Paid</span>
      ) : (
        <Money paisa={info.getValue()} className="block text-right" />
      ),
  }),
  helper.accessor("status", {
    header: "Status",
    cell: (info) =>
      info.getValue() === BillingStatus.Active ? (
        billingStatusLabels.active
      ) : (
        <Badge variant="destructive">{billingStatusLabels.cancelled}</Badge>
      ),
  }),
  helper.accessor("billed_at", {
    header: "Billed",
    cell: (info) => <DateTime value={info.getValue()} />,
  }),
  helper.display({
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => (
      <InvoiceRowActions
        invoiceId={row.original.id}
        invoiceNo={row.original.invoice_no}
      />
    ),
  }),
])

/** Bill List: the session branch's bills, newest first. View, preview and print duplicate. */
export function InvoiceTable() {
  const { page, perPage, sort, setPage, setSort, resetPage } = useListParams({
    defaultSort: "-billed_at",
  })
  const [filters, setFilters] = useQueryStates(
    {
      search: parseAsString,
      invoice_no: parseAsString,
      category: parseAsStringLiteral(Object.values(TestItemCategory)),
    },
    { history: "replace" }
  )

  const [searchInput, setSearchInput] = useState(filters.search ?? "")
  const [invoiceNoInput, setInvoiceNoInput] = useState(filters.invoice_no ?? "")
  const debouncedSearch = useDebouncedValue(searchInput)
  const debouncedInvoiceNo = useDebouncedValue(invoiceNoInput)

  useEffect(() => {
    const search = debouncedSearch.trim() || null
    const invoiceNo = debouncedInvoiceNo.trim() || null
    if (search !== filters.search || invoiceNo !== filters.invoice_no) {
      setFilters({ search, invoice_no: invoiceNo })
      resetPage()
    }
  }, [
    debouncedSearch,
    debouncedInvoiceNo,
    filters.search,
    filters.invoice_no,
    setFilters,
    resetPage,
  ])

  const query = useInvoices({
    filter: {
      search: filters.search,
      invoice_no: filters.invoice_no,
      category: filters.category,
    },
    sort,
    page,
    per_page: perPage,
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <InputGroup className="sm:max-w-48">
          <InputGroupInput
            placeholder="Invoice no"
            aria-label="Invoice no"
            value={invoiceNoInput}
            onChange={(event) => setInvoiceNoInput(event.target.value)}
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
          value={filters.category ?? ALL}
          onValueChange={(value) => {
            setFilters({
              category: value === ALL ? null : (value as TestItemCategory),
            })
            resetPage()
          }}
        >
          <SelectTrigger className="sm:w-40" aria-label="Type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All bills</SelectItem>
            {Object.values(TestItemCategory).map((category) => (
              <SelectItem key={category} value={category}>
                {testItemCategoryLabels[category]}
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
        sortableColumns={invoiceSortableColumns}
        onPageChange={setPage}
        getRowId={(row) => String(row.id)}
        emptyTitle="No bills"
      />
    </div>
  )
}
