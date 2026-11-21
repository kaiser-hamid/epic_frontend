"use client"

import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs"

import { dataTableColumnHelper } from "@/components/data-table/columns"
import { DataTable } from "@/components/data-table/data-table"
import { useListParams } from "@/components/data-table/use-list-params"
import { DateTime } from "@/components/date-time"
import { DateFilter, ScanFilter } from "@/components/list-filters"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { todayIsoDate } from "@/lib/format"
import { useBags } from "@/modules/blood-bank/blood-collections/queries"
import {
  bagSortableColumns,
  type Bag,
} from "@/modules/blood-bank/blood-collections/types"
import {
  CollectionStatus,
  collectionStatusLabels,
} from "@/modules/blood-bank/enums"
import { DonationUnitList } from "@/modules/blood-bank/units/components/donation-unit-list"
import { bloodGroupLabels } from "@/modules/shared/patient/enums"

const ALL = "all"

const helper = dataTableColumnHelper<Bag>()

const columns = helper.columns([
  helper.display({
    id: "units",
    header: "Unit no",
    cell: ({ row }) => <DonationUnitList units={row.original.units} />,
  }),
  helper.display({
    id: "donor",
    header: "Donor",
    cell: ({ row }) => {
      const { donor } = row.original
      return (
        <div className="flex flex-col">
          <span>
            {donor.name}
            {donor.blood_group
              ? ` · ${bloodGroupLabels[donor.blood_group]}`
              : null}
          </span>
          <span className="text-xs text-muted-foreground">
            {donor.donor_no}
          </span>
        </div>
      )
    },
  }),
  helper.display({
    id: "case_no",
    header: "Case no",
    cell: ({ row }) => row.original.case.case_no,
  }),
  helper.display({
    id: "patient",
    header: "Patient",
    cell: ({ row }) => {
      const { patient } = row.original
      if (!patient) {
        return "—"
      }
      return (
        <div className="flex flex-col">
          <span>{patient.name}</span>
          <span className="text-xs text-muted-foreground">
            {patient.patient_no}
          </span>
        </div>
      )
    },
  }),
  helper.accessor("collected_at", {
    header: "Collected",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <DateTime value={row.original.collected_at} />
        <span className="text-xs text-muted-foreground">
          {row.original.collected_by.name}
        </span>
      </div>
    ),
  }),
])

/**
 * Tab 3: donations, each with the units its blood was drawn into. A unit no (any unit of the
 * donation), case no or donor no scan is exact and searches every date;
 * otherwise the list covers the collected date range (today by default).
 */
export function CollectedBagTable() {
  const today = todayIsoDate()
  const { page, perPage, sort, setPage, setSort, resetPage } = useListParams({
    defaultSort: "-collected_at",
    prefix: "collected_",
  })
  const [filters, setFilters] = useQueryStates(
    {
      unit_no: parseAsString,
      case_no: parseAsString,
      donor_no: parseAsString,
      status: parseAsStringLiteral(Object.values(CollectionStatus)),
      from: parseAsString.withDefault(today),
      to: parseAsString.withDefault(today),
    },
    { history: "replace" }
  )

  const isScan = Boolean(filters.unit_no || filters.case_no || filters.donor_no)

  const query = useBags({
    filter: {
      unit_no: filters.unit_no,
      case_no: filters.case_no,
      donor_no: filters.donor_no,
      status: filters.status,
      collected_from: isScan ? null : filters.from,
      collected_to: isScan ? null : filters.to,
    },
    sort,
    page,
    per_page: perPage,
  })

  function update(next: Parameters<typeof setFilters>[0]) {
    setFilters(next)
    resetPage()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <ScanFilter
          id="filter_unit_no"
          label="Unit no"
          value={filters.unit_no}
          onCommit={(unitNo) => update({ unit_no: unitNo })}
        />
        <ScanFilter
          id="filter_case_no"
          label="Case no"
          value={filters.case_no}
          onCommit={(caseNo) => update({ case_no: caseNo })}
        />
        <ScanFilter
          id="filter_donor_no"
          label="Donor no"
          value={filters.donor_no}
          onCommit={(donorNo) => update({ donor_no: donorNo })}
        />
        <Field className="w-40">
          <FieldLabel htmlFor="filter_status">Status</FieldLabel>
          <Select
            value={filters.status ?? ALL}
            onValueChange={(value) =>
              update({
                status:
                  Object.values(CollectionStatus).find(
                    (status) => status === value
                  ) ?? null,
              })
            }
          >
            <SelectTrigger id="filter_status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {Object.values(CollectionStatus).map((status) => (
                <SelectItem key={status} value={status}>
                  {collectionStatusLabels[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <DateFilter
          id="filter_from"
          label="Collected from"
          value={filters.from}
          disabled={isScan}
          onCommit={(from) => update({ from })}
        />
        <DateFilter
          id="filter_to"
          label="Collected to"
          value={filters.to}
          disabled={isScan}
          onCommit={(to) => update({ to })}
        />
      </div>
      {isScan ? (
        <p className="-mt-2 text-xs text-muted-foreground">
          Bag no, case no and donor no searches cover all dates.
        </p>
      ) : null}

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
        sortableColumns={bagSortableColumns}
        onPageChange={setPage}
        getRowId={(row) => String(row.id)}
        emptyTitle="No bags"
      />
    </div>
  )
}
