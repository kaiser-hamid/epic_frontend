"use client"

import { ScanBarcodeIcon } from "lucide-react"
import { useEffect, useRef } from "react"

import { QueryError } from "@/components/query-error"
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
  DonorExaminationCard,
  donorCardKey,
} from "@/modules/blood-bank/donor-examinations/components/donor-examination-card"
import { examinationErrorText } from "@/modules/blood-bank/donor-examinations/error-messages"
import {
  useDonorExamination,
  useFindDonorExaminationByInvoice,
} from "@/modules/blood-bank/donor-examinations/queries"
import { BloodBankPermission } from "@/modules/blood-bank/permissions"
import { useCan } from "@/modules/shared/rbac/use-can"

/**
 * Tab 1: scan an invoice, see the patient panel and one examination form per donor. The
 * loaded case lives in the URL (`?case=`), so the Pending tab and a page reload can open it.
 */
export function ExaminationTab({
  caseId,
  onCaseChange,
}: {
  caseId: number | null
  onCaseChange: (caseId: number | null) => void
}) {
  const scanRef = useRef<HTMLInputElement>(null)
  const query = useDonorExamination(caseId)
  const lookup = useFindDonorExaminationByInvoice()
  const canRecord = useCan(BloodBankPermission.DonorExamRecord)
  const view = caseId === null ? undefined : query.data

  // `autoFocus` alone is unreliable here (the tab mounts behind the permission gate and
  // Suspense), so focus the invoice input explicitly on mount.
  useEffect(() => {
    scanRef.current?.focus()
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 xl:grid-cols-[20rem_1fr]">
        <InvoiceScanBox
          scanRef={scanRef}
          title="Work list"
          lookup={lookup}
          errorText={examinationErrorText}
          onCaseChange={onCaseChange}
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
                  Scan or type an invoice no, or open a case from the Pending
                  tab.
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
            {view.donors.map((donor) => (
              <DonorExaminationCard
                key={donorCardKey(donor)}
                caseId={view.case.id}
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
