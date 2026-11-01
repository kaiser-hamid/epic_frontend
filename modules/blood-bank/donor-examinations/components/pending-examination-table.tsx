"use client"

import { parseAsStringLiteral, useQueryStates } from "nuqs"

import { dataTableColumnHelper } from "@/components/data-table/columns"
import { DataTable } from "@/components/data-table/data-table"
import { useListParams } from "@/components/data-table/use-list-params"
import { DateTime } from "@/components/date-time"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { BloodBankCase } from "@/modules/blood-bank/cases/types"
import { usePendingExaminations } from "@/modules/blood-bank/donor-examinations/queries"
import { pendingExaminationSortableColumns } from "@/modules/blood-bank/donor-examinations/types"
import { CareType, careTypeLabels } from "@/modules/blood-bank/enums"
import { componentsSummary } from "@/modules/blood-bank/samples/format"
import { genderLabels } from "@/modules/shared/patient/enums"
import { formatPatientAge } from "@/modules/shared/patient/format"

const ALL = "all"

const helper = dataTableColumnHelper<BloodBankCase>()

const columns = helper.columns([
  helper.accessor("case_no", {
    header: "Case no",
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  }),
  helper.display({
    id: "invoice_no",
    header: "Invoice no",
    cell: ({ row }) => row.original.invoice?.invoice_no ?? "—",
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
            {patient.patient_no}
          </span>
        </div>
      )
    },
  }),
  helper.display({
    id: "age_gender",
    header: "Age / gender",
    cell: ({ row }) => {
      const patient = row.original.patient
      if (!patient) {
        return "—"
      }
      return (
        [
          formatPatientAge(patient),
          patient.gender ? genderLabels[patient.gender] : null,
        ]
          .filter(Boolean)
          .join(" · ") || "—"
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
    cell: ({ row }) => componentsSummary(row.original.components) ?? "—",
  }),
  helper.accessor("donors_count", {
    header: "Donors",
    cell: (info) => <span className="tabular-nums">{info.getValue()}</span>,
  }),
  helper.accessor("created_at", {
    header: "Registered at",
    cell: (info) => <DateTime value={info.getValue()} />,
  }),
])

/** Tab 2: open cases with a donor not examined yet. A row opens it on the Examination tab. */
export function PendingExaminationTable({
  onOpenCase,
}: {
  onOpenCase: (caseId: number) => void
}) {
  const { page, perPage, sort, setPage, setSort, resetPage } = useListParams({
    defaultSort: "created_at",
    prefix: "pending_",
  })
  const [filters, setFilters] = useQueryStates(
    { care_type: parseAsStringLiteral(Object.values(CareType)) },
    { history: "replace" }
  )

  const query = usePendingExaminations({
    filter: { care_type: filters.care_type },
    sort,
    page,
    per_page: perPage,
  })

  return (
    <div className="flex flex-col gap-4">
      <Select
        value={filters.care_type ?? ALL}
        onValueChange={(value) => {
          setFilters({
            care_type:
              Object.values(CareType).find((type) => type === value) ?? null,
          })
          resetPage()
        }}
      >
        <SelectTrigger className="sm:w-44" aria-label="Care of">
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
        sortableColumns={pendingExaminationSortableColumns}
        onPageChange={setPage}
        onRowClick={(row) => onOpenCase(row.id)}
        getRowId={(row) => String(row.id)}
        emptyTitle="No pending examinations"
        emptyDescription="Every donor of an open case has been examined."
      />
    </div>
  )
}
