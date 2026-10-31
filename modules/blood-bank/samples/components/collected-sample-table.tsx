"use client"

import { PrinterIcon, ScanBarcodeIcon } from "lucide-react"
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs"
import { useEffect, useState } from "react"

import { dataTableColumnHelper } from "@/components/data-table/columns"
import { DataTable } from "@/components/data-table/data-table"
import { useListParams } from "@/components/data-table/use-list-params"
import { DateInput } from "@/components/date-input"
import { DateTime } from "@/components/date-time"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
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
import { todayIsoDate } from "@/lib/format"
import {
  SampleStatus,
  sampleStatusLabels,
  SampleSubject,
  sampleSubjectLabels,
} from "@/modules/blood-bank/enums"
import { BloodBankPermission } from "@/modules/blood-bank/permissions"
import { useSampleLabelPrinter } from "@/modules/blood-bank/samples/components/sample-label-printer"
import { SampleStatusBadge } from "@/modules/blood-bank/samples/components/sample-status-badge"
import { subjectLabel } from "@/modules/blood-bank/samples/format"
import { useSamples } from "@/modules/blood-bank/samples/queries"
import {
  sampleSortableColumns,
  type SampleListItem,
} from "@/modules/blood-bank/samples/types"
import { useCan } from "@/modules/shared/rbac/use-can"

const ALL = "all"
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const helper = dataTableColumnHelper<SampleListItem>()

const columns = helper.columns([
  helper.accessor("sample_no", {
    header: "Sample no",
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  }),
  helper.display({
    id: "case_no",
    header: "Case no",
    cell: ({ row }) => row.original.case.case_no,
  }),
  helper.display({
    id: "subject_type",
    header: "Type",
    cell: ({ row }) => subjectLabel(row.original.subject),
  }),
  helper.display({
    id: "name",
    header: "Name",
    cell: ({ row }) => row.original.subject.name ?? "—",
  }),
  helper.display({
    id: "number",
    header: "ID",
    cell: ({ row }) => row.original.subject.number ?? "—",
  }),
  helper.accessor("status", {
    header: "Status",
    cell: (info) => <SampleStatusBadge status={info.getValue()} />,
  }),
  helper.accessor("collected_at", {
    header: "Collected at",
    cell: (info) => <DateTime value={info.getValue()} />,
  }),
  helper.display({
    id: "collected_by",
    header: "Collected by",
    cell: ({ row }) => row.original.collected_by.name,
  }),
  helper.display({
    id: "label",
    header: () => <span className="sr-only">Label</span>,
    cell: ({ row }) => <ReprintLabelButton sample={row.original} />,
  }),
])

/**
 * Tab 3: collected samples. A sample no or case no scan is exact and searches every date;
 * otherwise the list covers the collected date range (today by default).
 */
export function CollectedSampleTable() {
  const today = todayIsoDate()
  const { page, perPage, sort, setPage, setSort, resetPage } = useListParams({
    defaultSort: "-collected_at",
    prefix: "collected_",
  })
  const [filters, setFilters] = useQueryStates(
    {
      sample_no: parseAsString,
      case_no: parseAsString,
      status: parseAsStringLiteral(Object.values(SampleStatus)),
      subject_type: parseAsStringLiteral(Object.values(SampleSubject)),
      from: parseAsString.withDefault(today),
      to: parseAsString.withDefault(today),
    },
    { history: "replace" }
  )

  const isScan = Boolean(filters.sample_no || filters.case_no)

  const query = useSamples({
    filter: {
      sample_no: filters.sample_no,
      case_no: filters.case_no,
      status: filters.status,
      subject_type: filters.subject_type,
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
          id="filter_sample_no"
          label="Sample no"
          value={filters.sample_no}
          onCommit={(sampleNo) => update({ sample_no: sampleNo })}
        />
        <ScanFilter
          id="filter_case_no"
          label="Case no"
          value={filters.case_no}
          onCommit={(caseNo) => update({ case_no: caseNo })}
        />
        <Field className="w-40">
          <FieldLabel htmlFor="filter_status">Status</FieldLabel>
          <Select
            value={filters.status ?? ALL}
            onValueChange={(value) =>
              update({
                status:
                  Object.values(SampleStatus).find(
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
              {Object.values(SampleStatus).map((status) => (
                <SelectItem key={status} value={status}>
                  {sampleStatusLabels[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field className="w-36">
          <FieldLabel htmlFor="filter_subject_type">Type</FieldLabel>
          <Select
            value={filters.subject_type ?? ALL}
            onValueChange={(value) =>
              update({
                subject_type:
                  Object.values(SampleSubject).find((type) => type === value) ??
                  null,
              })
            }
          >
            <SelectTrigger id="filter_subject_type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All types</SelectItem>
              {Object.values(SampleSubject).map((type) => (
                <SelectItem key={type} value={type}>
                  {sampleSubjectLabels[type]}
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
          Sample no and case no searches cover all dates.
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
        sortableColumns={sampleSortableColumns}
        onPageChange={setPage}
        getRowId={(row) => String(row.id)}
        emptyTitle="No samples"
      />
    </div>
  )
}

/**
 * Exact-match text filter that also takes barcode scans: applied as typing pauses, or at
 * once on Enter (a scanner's suffix), then selected so the next scan replaces it.
 */
function ScanFilter({
  id,
  label,
  value,
  onCommit,
}: {
  id: string
  label: string
  value: string | null
  onCommit: (value: string | null) => void
}) {
  const [text, setText] = useState(value ?? "")
  const debounced = useDebouncedValue(text)

  useEffect(() => {
    const next = debounced.trim() || null
    if (next !== value) {
      onCommit(next)
    }
    // Only a settled edit commits; `value` changing from the URL must not re-commit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  return (
    <Field className="w-48">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <InputGroup>
        <InputGroupAddon>
          <ScanBarcodeIcon />
        </InputGroupAddon>
        <InputGroupInput
          id={id}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              const next = text.trim() || null
              if (next !== value) {
                onCommit(next)
              }
              event.currentTarget.select()
            }
          }}
          placeholder="Scan or type"
          autoComplete="off"
          spellCheck={false}
        />
      </InputGroup>
    </Field>
  )
}

/**
 * Date filter that only reaches the URL once a full date is typed or picked. Leaving it
 * empty or half-typed puts the applied date back.
 */
function DateFilter({
  id,
  label,
  value,
  disabled,
  onCommit,
}: {
  id: string
  label: string
  value: string
  disabled: boolean
  onCommit: (value: string) => void
}) {
  const [text, setText] = useState(value)

  return (
    <Field className="w-44">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <DateInput
        id={id}
        value={text}
        disabled={disabled}
        onChange={(next) => {
          setText(next)
          if (ISO_DATE.test(next) && next !== value) {
            onCommit(next)
          }
        }}
        onBlur={() => {
          if (!ISO_DATE.test(text)) {
            setText(value)
          }
        }}
      />
    </Field>
  )
}

function ReprintLabelButton({ sample }: { sample: SampleListItem }) {
  const canPrint = useCan(BloodBankPermission.SampleLabelPrint)
  const { print, isPrinting } = useSampleLabelPrinter()

  if (!canPrint) {
    return null
  }

  return (
    <Button
      variant="outline"
      size="xs"
      disabled={sample.status === SampleStatus.Rejected || isPrinting}
      // The list has no print count: the server answers REPRINT_REASON_REQUIRED when needed.
      onClick={() =>
        print({
          caseId: sample.case.id,
          sampleIds: [sample.id],
          isReprint: false,
        })
      }
      aria-label={`Print label ${sample.sample_no}`}
    >
      <PrinterIcon data-icon="inline-start" />
      Label
    </Button>
  )
}
