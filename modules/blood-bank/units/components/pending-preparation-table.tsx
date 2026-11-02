"use client"

import { dataTableColumnHelper } from "@/components/data-table/columns"
import { DataTable } from "@/components/data-table/data-table"
import { useListParams } from "@/components/data-table/use-list-params"
import { DateTime } from "@/components/date-time"
import type { Bag } from "@/modules/blood-bank/blood-collections/types"
import type { PreparationRef } from "@/modules/blood-bank/units/api"
import { usePendingPreparations } from "@/modules/blood-bank/units/queries"
import { pendingPreparationSortableColumns } from "@/modules/blood-bank/units/types"
import { bloodGroupLabels } from "@/modules/shared/patient/enums"

const helper = dataTableColumnHelper<Bag>()

const columns = helper.columns([
  helper.accessor("bag_no", {
    header: "Bag no",
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
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

/** Tab 2: collected bags with no units yet. A row opens it on the Preparation tab. */
export function PendingPreparationTable({
  onOpenBag,
}: {
  onOpenBag: (preparation: PreparationRef) => void
}) {
  const { page, perPage, sort, setPage, setSort } = useListParams({
    defaultSort: "collected_at",
    prefix: "pending_",
  })

  const query = usePendingPreparations({ sort, page, per_page: perPage })

  return (
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
      sortableColumns={pendingPreparationSortableColumns}
      onPageChange={setPage}
      onRowClick={(row) => onOpenBag({ caseId: row.case.id, bagId: row.id })}
      getRowId={(row) => String(row.id)}
      emptyTitle="No pending bags"
      emptyDescription="Every collected bag has been prepared."
    />
  )
}
