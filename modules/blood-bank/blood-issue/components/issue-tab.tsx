"use client"

import {
  CircleCheckIcon,
  HandHeartIcon,
  InfoIcon,
  PrinterIcon,
  ScanBarcodeIcon,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { QueryError } from "@/components/query-error"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
  ComponentsCard,
  DonorCards,
  PatientSampleCard,
} from "@/modules/blood-bank/blood-issue/components/case-details"
import { IssueBloodDialog } from "@/modules/blood-bank/blood-issue/components/issue-blood-dialog"
import { IssueInfoPanel } from "@/modules/blood-bank/blood-issue/components/issue-info-panel"
import { IssueUnitTable } from "@/modules/blood-bank/blood-issue/components/issue-unit-table"
import { ReprintDialog } from "@/modules/blood-bank/blood-issue/components/reprint-dialog"
import { sendReportToPrinter } from "@/modules/blood-bank/blood-issue/components/send-report"
import {
  BloodIssueErrorCode,
  bloodIssueErrorText,
} from "@/modules/blood-bank/blood-issue/error-messages"
import {
  useBloodIssue,
  useFindBloodIssue,
} from "@/modules/blood-bank/blood-issue/queries"
import type {
  BloodIssue,
  IssueUnit,
  PdfFile,
} from "@/modules/blood-bank/blood-issue/types"
import { InvoiceScanBox } from "@/modules/blood-bank/cases/components/invoice-scan-box"
import { CaseStatus } from "@/modules/blood-bank/enums"
import { BloodBankPermission } from "@/modules/blood-bank/permissions"
import { useCan } from "@/modules/shared/rbac/use-can"

/**
 * Tab 1: scan an invoice no or a donor no and see everything about the case: the patient, the
 * billed components, the patient sample, every donor and every unit. Tick units and "Issue
 * Blood"; reprint reports. The loaded case lives in the URL (`?case=`), so the Pending tab and
 * a page reload can open it.
 */
export function IssueTab({
  caseId,
  onCaseChange,
}: {
  caseId: number | null
  onCaseChange: (caseId: number | null) => void
}) {
  const scanRef = useRef<HTMLInputElement>(null)
  const query = useBloodIssue(caseId)
  const lookup = useFindBloodIssue()
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
          errorText={bloodIssueErrorText}
          notFoundCodes={[BloodIssueErrorCode.CaseNotFound]}
          onCaseChange={(nextCaseId) => onCaseChange(nextCaseId)}
        />
        <IssueInfoPanel
          view={view}
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
      ) : view ? (
        <IssueWorkspace key={view.case.id} view={view} onIssued={focusScan} />
      ) : (
        <Skeleton className="h-48 w-full" />
      )}
    </div>
  )
}

function IssueWorkspace({
  view,
  onIssued,
}: {
  view: BloodIssue
  onIssued: () => void
}) {
  const canRecord = useCan(BloodBankPermission.IssueRecord)
  const canPrint = useCan(BloodBankPermission.IssueReportPrint)
  // Every issuable unit is ticked unless unticked, so units that become issuable later are too.
  const [unticked, setUnticked] = useState<ReadonlySet<number>>(new Set())
  // The units the Issue form was opened for; a refetch while it is open must not change its rows.
  const [issuing, setIssuing] = useState<IssueUnit[] | null>(null)
  const [reprint, setReprint] = useState<number[] | null>(null)

  const issuable = view.units.filter((unit) => unit.can_issue)
  const selectedUnits = issuable.filter((unit) => !unticked.has(unit.id))
  const selectedIds = new Set(selectedUnits.map((unit) => unit.id))
  const reprintable = view.units.filter((unit) => unit.crossmatch !== null)
  const isClosed = view.case.status === CaseStatus.Closed

  function toggle(unitId: number, selected: boolean) {
    setUnticked((current) => {
      const next = new Set(current)
      if (selected) {
        next.delete(unitId)
      } else {
        next.add(unitId)
      }
      return next
    })
  }

  function handleIssued(pdf: PdfFile) {
    void sendReportToPrinter(pdf)
    toast.success("Blood issued")
    setIssuing(null)
    setUnticked(new Set())
    onIssued()
  }

  function handleReprinted(pdf: PdfFile) {
    void sendReportToPrinter(pdf)
    toast.success("Report sent to print")
    setReprint(null)
  }

  return (
    <div className="flex flex-col gap-4">
      {isClosed ? (
        <Alert>
          <CircleCheckIcon />
          <AlertTitle>Case closed</AlertTitle>
          <AlertDescription>
            Every billed component has been issued. Reports can still be
            reprinted.
          </AlertDescription>
        </Alert>
      ) : !view.can_issue ? (
        <Alert>
          <InfoIcon />
          <AlertDescription>
            {view.patient_sample === null
              ? "Collect the patient sample first (Sample Collection)."
              : "No unit is waiting to be issued: reserve units for this case through Component Preparation."}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <ComponentsCard components={view.case.components} />
        <PatientSampleCard sample={view.patient_sample} />
      </div>

      <Card size="sm" className="min-w-0">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>Units</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {canPrint && reprintable.length > 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReprint(reprintable.map((unit) => unit.id))}
              >
                <PrinterIcon data-icon="inline-start" />
                Reprint reports
              </Button>
            ) : null}
            {canRecord ? (
              <Button
                size="sm"
                disabled={!view.can_issue || selectedUnits.length === 0}
                onClick={() => setIssuing(selectedUnits)}
              >
                <HandHeartIcon data-icon="inline-start" />
                Issue Blood
                {view.can_issue && selectedUnits.length > 0
                  ? ` (${selectedUnits.length})`
                  : null}
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          <IssueUnitTable
            units={view.units}
            selectedIds={selectedIds}
            onSelectedChange={toggle}
            showSelection={canRecord && issuable.length > 0}
            canPrint={canPrint}
            onReprint={(unit: IssueUnit) => setReprint([unit.id])}
          />
        </CardContent>
      </Card>

      <DonorCards donors={view.donors} />

      {canRecord ? (
        <IssueBloodDialog
          view={view}
          units={issuing ?? []}
          open={issuing !== null}
          onOpenChange={(open) => {
            if (!open) {
              setIssuing(null)
            }
          }}
          onIssued={handleIssued}
        />
      ) : null}
      {canPrint ? (
        <ReprintDialog
          caseId={view.case.id}
          units={reprintable}
          initialUnitIds={reprint ?? []}
          open={reprint !== null}
          onOpenChange={(open) => {
            if (!open) {
              setReprint(null)
            }
          }}
          onPrinted={handleReprinted}
        />
      ) : null}
    </div>
  )
}
