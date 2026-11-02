"use client"

import { addYears } from "date-fns"
import { PrinterIcon } from "lucide-react"
import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs"
import { toast } from "sonner"

import { dataTableColumnHelper } from "@/components/data-table/columns"
import { DataTable } from "@/components/data-table/data-table"
import { useListParams } from "@/components/data-table/use-list-params"
import { DateTime } from "@/components/date-time"
import { DateFilter, ScanFilter } from "@/components/list-filters"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useComponentTypes } from "@/modules/blood-bank/component-types/queries"
import { UnitStatus, unitStatusLabels } from "@/modules/blood-bank/enums"
import { BloodBankPermission } from "@/modules/blood-bank/permissions"
import { useStorageLocations } from "@/modules/blood-bank/storage-locations/queries"
import { useUnitLabelPrinter } from "@/modules/blood-bank/units/components/unit-label-printer"
import {
  UnitExpiry,
  UnitStatusBadge,
} from "@/modules/blood-bank/units/components/unit-status-badge"
import { unitErrorText } from "@/modules/blood-bank/units/error-messages"
import { storageText } from "@/modules/blood-bank/units/format"
import {
  useFindComponentPreparation,
  useUnits,
} from "@/modules/blood-bank/units/queries"
import {
  unitSortableColumns,
  type Unit,
} from "@/modules/blood-bank/units/types"
import { BloodGroup, bloodGroupLabels } from "@/modules/shared/patient/enums"
import { useCan } from "@/modules/shared/rbac/use-can"

const ALL = "all"

const helper = dataTableColumnHelper<Unit>()

const columns = helper.columns([
  helper.accessor("unit_no", {
    header: "Unit no",
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  }),
  helper.display({
    id: "component",
    header: "Component",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span>{row.original.component.name}</span>
        <span className="text-xs text-muted-foreground">
          {row.original.component.code}
        </span>
      </div>
    ),
  }),
  helper.accessor("blood_group", {
    header: "Blood group",
    cell: (info) => {
      const group = info.getValue()
      return group ? bloodGroupLabels[group] : "—"
    },
  }),
  helper.accessor("volume_ml", {
    header: "Volume",
    cell: (info) => {
      const volume = info.getValue()
      return (
        <span className="tabular-nums">
          {volume === null ? "—" : `${volume} ml`}
        </span>
      )
    },
  }),
  helper.display({
    id: "storage_location",
    header: "Storage",
    cell: ({ row }) => storageText(row.original),
  }),
  helper.accessor("status", {
    header: "Status",
    cell: (info) => <UnitStatusBadge status={info.getValue()} />,
  }),
  helper.display({
    id: "reserved_for",
    header: "Reserved for",
    cell: ({ row }) => {
      const reserved = row.original.reserved_for
      if (!reserved) {
        return "—"
      }
      return (
        <div className="flex flex-col">
          <span>{reserved.patient_name ?? reserved.case_no}</span>
          <span className="text-xs text-muted-foreground">
            {[reserved.patient_no, reserved.case_no]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
      )
    },
  }),
  helper.display({
    id: "bag_no",
    header: "Bag no",
    cell: ({ row }) => row.original.bag_no,
  }),
  helper.accessor("prepared_at", {
    header: "Prepared at",
    cell: (info) => <DateTime value={info.getValue()} />,
  }),
  helper.accessor("expires_at", {
    header: "Expires at",
    cell: (info) => <UnitExpiry expiresAt={info.getValue()} />,
  }),
  helper.display({
    id: "label",
    header: () => <span className="sr-only">Label</span>,
    cell: ({ row }) => <LabelButton unit={row.original} />,
  }),
])

/**
 * Tab 3: blood units of the branch, soonest expiry first; units expiring within 3 days are
 * highlighted. A unit no scan finds one unit.
 */
export function UnitTable() {
  const { page, perPage, sort, setPage, setSort, resetPage } = useListParams({
    defaultSort: "expires_at",
    prefix: "units_",
  })
  const [filters, setFilters] = useQueryStates(
    {
      unit_no: parseAsString,
      bag_no: parseAsString,
      case_no: parseAsString,
      component: parseAsInteger,
      blood_group: parseAsStringLiteral(Object.values(BloodGroup)),
      status: parseAsStringLiteral(Object.values(UnitStatus)),
      storage: parseAsInteger,
      expires_before: parseAsString,
    },
    { history: "replace" }
  )
  const componentTypes = useComponentTypes()
  const storageLocations = useStorageLocations()

  const query = useUnits({
    filter: {
      unit_no: filters.unit_no,
      bag_no: filters.bag_no,
      case_no: filters.case_no,
      component_type_id: filters.component,
      blood_group: filters.blood_group,
      status: filters.status,
      storage_location_id: filters.storage,
      expires_before: filters.expires_before,
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
          id="filter_bag_no"
          label="Bag no"
          value={filters.bag_no}
          onCommit={(bagNo) => update({ bag_no: bagNo })}
        />
        <ScanFilter
          id="filter_case_no"
          label="Case no"
          value={filters.case_no}
          onCommit={(caseNo) => update({ case_no: caseNo })}
        />
        <Field className="w-48">
          <FieldLabel htmlFor="filter_component">Component</FieldLabel>
          <Select
            value={filters.component === null ? ALL : String(filters.component)}
            onValueChange={(value) =>
              update({ component: value === ALL ? null : Number(value) })
            }
          >
            <SelectTrigger id="filter_component">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All components</SelectItem>
              {componentTypes.data?.map((type) => (
                <SelectItem key={type.id} value={String(type.id)}>
                  {type.code} – {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field className="w-36">
          <FieldLabel htmlFor="filter_blood_group">Blood group</FieldLabel>
          <Select
            value={filters.blood_group ?? ALL}
            onValueChange={(value) =>
              update({
                blood_group:
                  Object.values(BloodGroup).find((group) => group === value) ??
                  null,
              })
            }
          >
            <SelectTrigger id="filter_blood_group">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All groups</SelectItem>
              {Object.values(BloodGroup).map((group) => (
                <SelectItem key={group} value={group}>
                  {bloodGroupLabels[group]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field className="w-40">
          <FieldLabel htmlFor="filter_status">Status</FieldLabel>
          <Select
            value={filters.status ?? ALL}
            onValueChange={(value) =>
              update({
                status:
                  Object.values(UnitStatus).find(
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
              {Object.values(UnitStatus).map((status) => (
                <SelectItem key={status} value={status}>
                  {unitStatusLabels[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field className="w-52">
          <FieldLabel htmlFor="filter_storage">Storage</FieldLabel>
          <Select
            value={filters.storage === null ? ALL : String(filters.storage)}
            onValueChange={(value) =>
              update({ storage: value === ALL ? null : Number(value) })
            }
          >
            <SelectTrigger id="filter_storage">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All locations</SelectItem>
              {storageLocations.data?.map((location) => (
                <SelectItem key={location.id} value={String(location.id)}>
                  {location.code} – {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <DateFilter
          id="filter_expires_before"
          label="Expires by"
          value={filters.expires_before ?? ""}
          clearable
          max={addYears(new Date(), 2)}
          onCommit={(date) => update({ expires_before: date || null })}
        />
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
        sortableColumns={unitSortableColumns}
        onPageChange={setPage}
        getRowId={(row) => String(row.id)}
        emptyTitle="No units"
      />
    </div>
  )
}

/**
 * Labels are printed through the case whose bag the unit was made from, which a list row
 * doesn't carry (`reserved_for` may be another case, or none for stock). So the bag is looked
 * up first; its screen gives the case and the unit's print count, so a reprint asks for the
 * reason up front.
 */
function LabelButton({ unit }: { unit: Unit }) {
  const canPrint = useCan(BloodBankPermission.UnitLabelPrint)
  const { print, isPrinting } = useUnitLabelPrinter()
  const lookup = useFindComponentPreparation()

  if (!canPrint) {
    return null
  }

  return (
    <Button
      variant="outline"
      size="xs"
      disabled={isPrinting || lookup.isPending}
      onClick={() =>
        lookup.mutate(unit.bag_no, {
          onSuccess: (view) => {
            const printCount =
              view.units.find((candidate) => candidate.id === unit.id)
                ?.label_print_count ?? 0
            print({
              caseId: view.case.id,
              unitIds: [unit.id],
              isReprint: printCount > 0,
            })
          },
          onError: (error) => toast.error(unitErrorText(error)),
        })
      }
      aria-label={`Print label ${unit.unit_no}`}
    >
      {lookup.isPending ? (
        <Spinner data-icon="inline-start" />
      ) : (
        <PrinterIcon data-icon="inline-start" />
      )}
      Label
    </Button>
  )
}
