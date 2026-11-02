"use client"

import { ScanBarcodeIcon } from "lucide-react"
import { useEffect, useRef } from "react"

import { QueryError } from "@/components/query-error"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { CaseInformationPanel } from "@/modules/blood-bank/cases/components/case-information-panel"
import { InvoiceScanBox } from "@/modules/blood-bank/cases/components/invoice-scan-box"
import {
  DonorSerologyCard,
  serologyCardKey,
} from "@/modules/blood-bank/donor-serology/components/donor-serology-card"
import {
  SerologyErrorCode,
  serologyErrorText,
} from "@/modules/blood-bank/donor-serology/error-messages"
import { scanFocus } from "@/modules/blood-bank/donor-serology/focus"
import {
  useDonorSerology,
  useFindDonorSerology,
} from "@/modules/blood-bank/donor-serology/queries"
import { BloodBankPermission } from "@/modules/blood-bank/permissions"
import { useCan } from "@/modules/shared/rbac/use-can"

/**
 * Tab 1: scan an invoice or sample no, see the patient panel and one serology form per
 * donor. An invoice scan shows every donor; a sample scan only the donor it was drawn from
 * (`focusDonorId`). Both live in the URL (`?case=&donor=`), so the Pending tab and a page
 * reload can open them.
 */
export function SerologyTab({
  caseId,
  focusDonorId,
  onCaseChange,
}: {
  caseId: number | null
  focusDonorId: number | null
  onCaseChange: (caseId: number | null, focusDonorId: number | null) => void
}) {
  const scanRef = useRef<HTMLInputElement>(null)
  const query = useDonorSerology(caseId, focusDonorId)
  const lookup = useFindDonorSerology()
  const canRecord = useCan(BloodBankPermission.SerologyRecord)
  const view = caseId === null ? undefined : query.data

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
          label="Invoice / sample no"
          lookup={lookup}
          errorText={serologyErrorText}
          notFoundCodes={[
            SerologyErrorCode.CaseNotFound,
            SerologyErrorCode.DonorSampleNotFound,
          ]}
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
                  Scan or type an invoice no or a sample no, or open a case from
                  the Pending tab.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : query.isError && !query.data ? (
        <QueryError error={query.error} onRetry={() => query.refetch()} />
      ) : view ? (
        view.donors.length === 0 ? (
          <Card>
            <CardContent>
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>No donors</EmptyTitle>
                  <EmptyDescription>
                    No donor is registered for this case.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {focusDonorId !== null ? (
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                <span>Showing only the donor of the scanned sample.</span>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => onCaseChange(view.case.id, null)}
                >
                  Show all donors
                </Button>
              </div>
            ) : null}
            {view.donors.map((donor) => (
              <DonorSerologyCard
                key={serologyCardKey(donor)}
                caseId={view.case.id}
                caseStatus={view.case.status}
                donor={donor}
                canRecord={canRecord}
              />
            ))}
          </div>
        )
      ) : (
        <Skeleton className="h-48 w-full" />
      )}
    </div>
  )
}
