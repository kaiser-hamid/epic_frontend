"use client"

import { InfoIcon, PrinterIcon, ScanBarcodeIcon } from "lucide-react"
import { useEffect, useRef } from "react"
import { toast } from "sonner"

import { QueryError } from "@/components/query-error"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { InvoiceScanBox } from "@/modules/blood-bank/cases/components/invoice-scan-box"
import { useComponentTypes } from "@/modules/blood-bank/component-types/queries"
import { BloodBankPermission } from "@/modules/blood-bank/permissions"
import { useStorageLocations } from "@/modules/blood-bank/storage-locations/queries"
import type { PreparationRef } from "@/modules/blood-bank/units/api"
import { PrepareUnitsForm } from "@/modules/blood-bank/units/components/prepare-units-form"
import { PreparationInfoPanel } from "@/modules/blood-bank/units/components/preparation-info-panel"
import { useUnitLabelPrinter } from "@/modules/blood-bank/units/components/unit-label-printer"
import {
  UnitExpiry,
  UnitStatusBadge,
} from "@/modules/blood-bank/units/components/unit-status-badge"
import {
  UnitErrorCode,
  unitErrorText,
} from "@/modules/blood-bank/units/error-messages"
import {
  useComponentPreparation,
  useFindComponentPreparation,
} from "@/modules/blood-bank/units/queries"
import { storageText } from "@/modules/blood-bank/units/format"
import {
  findWholeBlood,
  requirementKey,
} from "@/modules/blood-bank/units/schemas"
import type {
  ComponentPreparation,
  PreparationUnit,
} from "@/modules/blood-bank/units/types"
import { bloodGroupLabels } from "@/modules/shared/patient/enums"
import { useCan } from "@/modules/shared/rbac/use-can"

/**
 * Tab 1: scan a bag label, see the bag, donor, patient and case, prepare the bag into units
 * (once) and print their component labels. The loaded bag lives in the URL (`?case=&bag=`),
 * so the Pending tab and a page reload can open it too.
 */
export function PreparationTab({
  preparation,
  onBagChange,
}: {
  preparation: PreparationRef | null
  onBagChange: (preparation: PreparationRef | null) => void
}) {
  const scanRef = useRef<HTMLInputElement>(null)
  const query = useComponentPreparation(preparation)
  const lookup = useFindComponentPreparation()
  const view = preparation === null ? undefined : query.data

  function focusScan() {
    scanRef.current?.focus()
    scanRef.current?.select()
  }

  // `autoFocus` alone is unreliable here (the tab mounts behind the permission gate and
  // Suspense), so focus the scan input explicitly on mount.
  useEffect(() => {
    scanRef.current?.focus()
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 xl:grid-cols-[20rem_1fr]">
        <InvoiceScanBox
          scanRef={scanRef}
          title="Work list"
          label="Bag no"
          lookup={lookup}
          errorText={unitErrorText}
          notFoundCodes={[UnitErrorCode.BagNotFound]}
          onCaseChange={(caseId, found) =>
            onBagChange(
              caseId === null || !found
                ? null
                : { caseId, bagId: found.view.bag.id }
            )
          }
        />
        <PreparationInfoPanel
          view={view}
          isLoading={preparation !== null && query.isPending}
        />
      </div>

      {preparation === null ? (
        <Card>
          <CardContent>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ScanBarcodeIcon />
                </EmptyMedia>
                <EmptyTitle>No bag loaded</EmptyTitle>
                <EmptyDescription>
                  Scan or type a bag no, or open a bag from the Pending tab.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : query.isError && !query.data ? (
        <QueryError error={query.error} onRetry={() => query.refetch()} />
      ) : view ? (
        <PreparationWorkspace
          key={`${view.case.id}:${view.bag.id}`}
          view={view}
          onPrepared={focusScan}
        />
      ) : (
        <Skeleton className="h-48 w-full" />
      )}
    </div>
  )
}

function PreparationWorkspace({
  view,
  onPrepared,
}: {
  view: ComponentPreparation
  onPrepared: () => void
}) {
  const canPrepare = useCan(BloodBankPermission.UnitPrepare)
  const canPrint = useCan(BloodBankPermission.UnitLabelPrint)
  const { print } = useUnitLabelPrinter()
  const showForm = canPrepare && view.can_prepare

  function handlePrepared(next: ComponentPreparation) {
    const count = next.prepared_unit_ids.length
    toast.success(count === 1 ? "1 unit prepared." : `${count} units prepared.`)
    if (canPrint && count > 0) {
      print({
        caseId: next.case.id,
        unitIds: next.prepared_unit_ids,
        isReprint: false,
      })
    }
    onPrepared()
  }

  return (
    <div className="flex flex-col gap-4">
      {showForm ? (
        <PrepareFormLoader view={view} onPrepared={handlePrepared} />
      ) : null}
      {!view.can_prepare && view.units.length === 0 ? (
        <Alert>
          <InfoIcon />
          <AlertDescription>
            This bag can&apos;t be prepared: the case is closed or the bag was
            cancelled.
          </AlertDescription>
        </Alert>
      ) : null}
      {view.units.length > 0 ? (
        <UnitsGrid caseId={view.case.id} units={view.units} />
      ) : null}
    </div>
  )
}

/** The form needs the component types and storage locations for its dropdowns. */
function PrepareFormLoader({
  view,
  onPrepared,
}: {
  view: ComponentPreparation
  onPrepared: (view: ComponentPreparation) => void
}) {
  const componentTypes = useComponentTypes()
  const storageLocations = useStorageLocations()

  if (componentTypes.isError) {
    return (
      <QueryError
        error={componentTypes.error}
        onRetry={() => componentTypes.refetch()}
      />
    )
  }
  if (storageLocations.isError) {
    return (
      <QueryError
        error={storageLocations.error}
        onRetry={() => storageLocations.refetch()}
      />
    )
  }
  if (!componentTypes.data || !storageLocations.data) {
    return <Skeleton className="h-48 w-full" />
  }

  const wholeBlood = findWholeBlood(componentTypes.data)

  return (
    <PrepareUnitsForm
      // Pre-filled for the case's needs: a refetch that changes them starts it again.
      key={requirementKey(view)}
      view={view}
      wholeBlood={wholeBlood}
      componentTypes={componentTypes.data.filter(
        (type) => type.id !== wholeBlood?.id
      )}
      storageLocations={storageLocations.data}
      onPrepared={onPrepared}
    />
  )
}

function UnitsGrid({
  caseId,
  units,
}: {
  caseId: number
  units: PreparationUnit[]
}) {
  const canPrint = useCan(BloodBankPermission.UnitLabelPrint)
  const { print, isPrinting } = useUnitLabelPrinter()

  function printUnits(selected: PreparationUnit[]) {
    print({
      caseId,
      unitIds: selected.map((unit) => unit.id),
      isReprint: selected.some((unit) => unit.label_print_count > 0),
    })
  }

  return (
    <Card size="sm" className="min-w-0">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>Units</CardTitle>
        {canPrint ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => printUnits(units)}
            disabled={isPrinting}
          >
            <PrinterIcon data-icon="inline-start" />
            Label (All)
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit no</TableHead>
                <TableHead>Component</TableHead>
                <TableHead>Blood group</TableHead>
                <TableHead>Volume</TableHead>
                <TableHead>Storage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires at</TableHead>
                {canPrint ? (
                  <TableHead>
                    <span className="sr-only">Label</span>
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {units.map((unit) => (
                <TableRow key={unit.id}>
                  <TableCell className="font-medium">{unit.unit_no}</TableCell>
                  <TableCell>{unit.component.name}</TableCell>
                  <TableCell>
                    {unit.blood_group
                      ? bloodGroupLabels[unit.blood_group]
                      : "—"}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {unit.volume_ml === null ? "—" : `${unit.volume_ml} ml`}
                  </TableCell>
                  <TableCell>{storageText(unit)}</TableCell>
                  <TableCell>
                    <UnitStatusBadge status={unit.status} />
                  </TableCell>
                  <TableCell>
                    <UnitExpiry expiresAt={unit.expires_at} />
                  </TableCell>
                  {canPrint ? (
                    <TableCell>
                      <Button
                        variant="outline"
                        size="xs"
                        disabled={isPrinting}
                        onClick={() => printUnits([unit])}
                        aria-label={`Print label ${unit.unit_no}`}
                      >
                        <PrinterIcon data-icon="inline-start" />
                        Label
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
