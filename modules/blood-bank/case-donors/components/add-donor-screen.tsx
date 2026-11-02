"use client"

import { LockIcon, ScanBarcodeIcon } from "lucide-react"
import { parseAsString, useQueryState } from "nuqs"
import { useEffect, useRef } from "react"

import { QueryError } from "@/components/query-error"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { AddDonorForm } from "@/modules/blood-bank/case-donors/components/add-donor-form"
import { CaseDonorsTable } from "@/modules/blood-bank/case-donors/components/case-donors-table"
import { addDonorErrorText } from "@/modules/blood-bank/case-donors/error-messages"
import {
  useAddDonorCase,
  useFindAddDonorCase,
} from "@/modules/blood-bank/case-donors/queries"
import { CaseInformationPanel } from "@/modules/blood-bank/cases/components/case-information-panel"
import { InvoiceScanBox } from "@/modules/blood-bank/cases/components/invoice-scan-box"
import { CaseStatus } from "@/modules/blood-bank/enums"

/**
 * Scan the case's invoice (or one already used for an added donor), see the case and its
 * donors, and add one donor per save. The scanned invoice stays in the URL
 * (`?invoice_no=`), so a reload reopens the case.
 */
export function AddDonorScreen() {
  const scanRef = useRef<HTMLInputElement>(null)
  const [invoiceNo, setInvoiceNo] = useQueryState(
    "invoice_no",
    parseAsString.withOptions({ history: "replace" })
  )
  const query = useAddDonorCase(invoiceNo)
  const lookup = useFindAddDonorCase()
  const record = invoiceNo === null ? undefined : query.data

  // `autoFocus` alone is unreliable here (the page mounts behind the permission gate and
  // Suspense), so focus the scan input explicitly on mount.
  useEffect(() => {
    scanRef.current?.focus()
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 xl:grid-cols-[20rem_1fr]">
        <InvoiceScanBox
          scanRef={scanRef}
          title="Find case"
          // The lookup returns the case itself; the scan box expects a screen `{ case }`.
          lookup={{
            isPending: lookup.isPending,
            mutate: (value, { onSuccess, onError }) =>
              lookup.mutate(value, {
                onSuccess: (found) => onSuccess({ case: found }),
                onError,
              }),
          }}
          errorText={addDonorErrorText}
          onCaseChange={(caseId, found) =>
            setInvoiceNo(caseId === null || !found ? null : found.scanned)
          }
        />
        <CaseInformationPanel
          record={record}
          patient={record?.patient}
          invoice={record?.invoice}
          isLoading={invoiceNo !== null && query.isPending}
          showAmount
        />
      </div>

      {invoiceNo === null ? (
        <Card>
          <CardContent>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ScanBarcodeIcon />
                </EmptyMedia>
                <EmptyTitle>No case loaded</EmptyTitle>
                <EmptyDescription>
                  Scan or type the case invoice no, or an invoice already used
                  for an added donor.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : query.isError && !query.data ? (
        <QueryError error={query.error} onRetry={() => query.refetch()} />
      ) : record ? (
        <>
          <CaseDonorsTable donors={record.donors ?? []} />
          {record.status === CaseStatus.Open ? (
            <AddDonorForm
              // A new donor count (a save, or a reload) starts a clean form.
              key={`${record.id}:${record.donors?.length ?? 0}`}
              record={record}
              invoiceNo={invoiceNo}
            />
          ) : (
            <Alert>
              <LockIcon />
              <AlertDescription>
                Case is closed — donors cannot be added.
              </AlertDescription>
            </Alert>
          )}
        </>
      ) : (
        <Skeleton className="h-48 w-full" />
      )}
    </div>
  )
}
