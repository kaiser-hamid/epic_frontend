"use client"

import { DropletIcon, ScanBarcodeIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { DateTime } from "@/components/date-time"
import { QueryError } from "@/components/query-error"
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
import { cn } from "@/lib/utils"
import { CollectBloodDialog } from "@/modules/blood-bank/blood-collections/components/collect-blood-dialog"
import { PhlebotomyPanel } from "@/modules/blood-bank/blood-collections/components/phlebotomy-panel"
import {
  BloodCollectionErrorCode,
  bloodCollectionErrorText,
} from "@/modules/blood-bank/blood-collections/error-messages"
import {
  useBloodCollection,
  useFindBloodCollection,
} from "@/modules/blood-bank/blood-collections/queries"
import { scanFocus } from "@/modules/blood-bank/blood-collections/focus"
import type {
  BloodCollection,
  CollectionDonor,
} from "@/modules/blood-bank/blood-collections/types"
import { CaseDonorStatusBadge } from "@/modules/blood-bank/case-donors/components/case-donor-status-badge"
import { CaseInformationPanel } from "@/modules/blood-bank/cases/components/case-information-panel"
import { InvoiceScanBox } from "@/modules/blood-bank/cases/components/invoice-scan-box"
import {
  CaseDonorStatus,
  CaseService,
  CaseStatus,
} from "@/modules/blood-bank/enums"
import { BloodBankPermission } from "@/modules/blood-bank/permissions"
import { useUnitLabelPrinter } from "@/modules/blood-bank/units/components/unit-label-printer"
import { bloodGroupLabels, genderLabels } from "@/modules/shared/patient/enums"
import { useCan } from "@/modules/shared/rbac/use-can"
import { formatAge } from "@/modules/shared/patient/format"

/**
 * Tab 1: scan an invoice no or a donor no, see the patient panel and one row per donor,
 * collect blood from an eligible donor (the bag and its units, labels printed). An invoice
 * scan shows every donor; a donor no scan only that donor (`focusDonorId`). Both live in the URL
 * (`?case=&donor=`), so the Pending tab and a page reload can open them.
 */
export function CollectionTab({
  caseId,
  focusDonorId,
  onCaseChange,
}: {
  caseId: number | null
  focusDonorId: number | null
  onCaseChange: (caseId: number | null, focusDonorId: number | null) => void
}) {
  const scanRef = useRef<HTMLInputElement>(null)
  const query = useBloodCollection(caseId, focusDonorId)
  const lookup = useFindBloodCollection()
  const view = caseId === null ? undefined : query.data

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
          label="Invoice / donor no"
          lookup={lookup}
          errorText={bloodCollectionErrorText}
          notFoundCodes={[BloodCollectionErrorCode.CaseNotFound]}
          onCaseChange={(nextCaseId, found) =>
            onCaseChange(
              nextCaseId,
              found ? scanFocus(found.scanned, found.view) : null
            )
          }
        />
        <CaseInformationPanel
          record={view?.case}
          patient={view?.patient}
          invoice={view?.invoice}
          isLoading={caseId !== null && query.isPending}
        />
      </div>

      {caseId === null ? (
        <Card>
          <CardContent>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ScanBarcodeIcon />
                </EmptyMedia>
                <EmptyTitle>No case loaded</EmptyTitle>
                <EmptyDescription>
                  Scan or type an invoice no or a donor no, or open a case from
                  the Pending tab.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : query.isError && !query.data ? (
        <QueryError error={query.error} onRetry={() => query.refetch()} />
      ) : view?.case.service === CaseService.TherapeuticPhlebotomy ? (
        <PhlebotomyPanel
          key={view.case.id}
          view={view}
          onRecorded={focusScan}
        />
      ) : view ? (
        <CollectionWorkspace
          key={view.case.id}
          view={view}
          isFocused={focusDonorId !== null}
          onShowAll={() => onCaseChange(view.case.id, null)}
          onCollected={focusScan}
        />
      ) : (
        <Skeleton className="h-48 w-full" />
      )}
    </div>
  )
}

function CollectionWorkspace({
  view,
  isFocused,
  onShowAll,
  onCollected,
}: {
  view: BloodCollection
  isFocused: boolean
  onShowAll: () => void
  onCollected: () => void
}) {
  const caseId = view.case.id
  const canCollect = useCan(BloodBankPermission.CollectionCollect)
  const { printLogged } = useUnitLabelPrinter()
  const [collecting, setCollecting] = useState<CollectionDonor | null>(null)
  const needsNothingMore =
    view.case.status === CaseStatus.Open && view.bag_plan.length === 0

  function handleCollected(next: BloodCollection) {
    setCollecting(null)
    const bag = next.donors.find(
      (donor) => donor.collection?.id === next.collected_collection_id
    )?.collection
    const units = next.collected_units.map((unit) => unit.unit_no).join(", ")
    toast.success(
      bag
        ? `Blood collected: bag ${bag.bag_no}, units ${units}.`
        : "Blood collected."
    )
    // The backend logged these labels as printed and returned their printer commands.
    printLogged(next.collected_units)
    onCollected()
  }

  return (
    <>
      <Card size="sm" className="min-w-0">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>Donors</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {isFocused ? (
              <>
                <span className="text-sm text-muted-foreground">
                  Showing only the scanned donor.
                </span>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={onShowAll}
                >
                  Show all donors
                </Button>
              </>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {needsNothingMore ? (
            <p className="text-sm text-muted-foreground">
              The case already has every component it was billed for; no more
              blood is collected for it. Unit labels are reprinted from Units.
            </p>
          ) : null}
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Donor no</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Blood group</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Bag no</TableHead>
                  <TableHead>Volume</TableHead>
                  <TableHead>Collected</TableHead>
                  {canCollect ? (
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {view.donors.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={11}
                      className="text-center text-muted-foreground"
                    >
                      No donor is registered for this case.
                    </TableCell>
                  </TableRow>
                ) : (
                  view.donors.map((donor) => (
                    <DonorRow
                      key={donor.case_donor_id ?? donor.number}
                      donor={donor}
                      canCollect={canCollect}
                      onCollect={() => setCollecting(donor)}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {canCollect ? (
        <CollectBloodDialog
          caseId={caseId}
          donor={collecting}
          plan={view.bag_plan}
          onOpenChange={(open) => {
            if (!open) {
              setCollecting(null)
            }
          }}
          onCollected={handleCollected}
        />
      ) : null}
    </>
  )
}

function DonorRow({
  donor,
  canCollect,
  onCollect,
}: {
  donor: CollectionDonor
  canCollect: boolean
  onCollect: () => void
}) {
  const { collection: bag } = donor
  const deferred = donor.case_donor_status === CaseDonorStatus.Deferred
  const name = donor.name ?? donor.number ?? "donor"

  return (
    <TableRow className={cn(deferred && "text-muted-foreground opacity-60")}>
      <TableCell className="tabular-nums">{donor.sequence_no ?? "—"}</TableCell>
      <TableCell className="font-medium">{donor.number ?? "—"}</TableCell>
      <TableCell>{donor.name ?? "—"}</TableCell>
      <TableCell className="tabular-nums">
        {formatAge(donor.age) ?? "—"}
      </TableCell>
      <TableCell>{donor.gender ? genderLabels[donor.gender] : "—"}</TableCell>
      <TableCell>
        {donor.blood_group ? bloodGroupLabels[donor.blood_group] : "—"}
      </TableCell>
      <TableCell>
        {donor.case_donor_status ? (
          <CaseDonorStatusBadge status={donor.case_donor_status} />
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="font-medium">{bag?.bag_no ?? "—"}</TableCell>
      <TableCell className="tabular-nums">
        {bag ? `${bag.volume_ml} ml` : "—"}
      </TableCell>
      <TableCell>
        {bag ? (
          <div className="flex flex-col">
            <DateTime value={bag.collected_at} />
            <span className="text-xs text-muted-foreground">
              {bag.collected_by.name}
            </span>
          </div>
        ) : (
          "—"
        )}
      </TableCell>
      {canCollect ? (
        <TableCell>
          <div className="flex justify-end gap-2">
            <Button
              size="xs"
              disabled={!donor.is_collectable}
              onClick={onCollect}
              aria-label={`Collect blood from ${name}`}
            >
              <DropletIcon data-icon="inline-start" />
              Collect
            </Button>
          </div>
        </TableCell>
      ) : null}
    </TableRow>
  )
}
