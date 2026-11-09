"use client"

import { EyeIcon, FileSearchIcon, PrinterIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { RowActions, ViewRowAction } from "@/components/data-table/row-actions"
import { ReasonDialog } from "@/components/reason-dialog"
import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { ErrorCode, errorMessage, hasErrorCode } from "@/lib/api-error"
import { openPdf } from "@/lib/open-pdf"
import { sendInvoiceToPrinter } from "@/modules/shared/billing/invoices/components/send-invoice"
import { invoiceErrorMessages } from "@/modules/shared/billing/invoices/error-messages"
import {
  usePreviewInvoice,
  usePrintInvoice,
} from "@/modules/shared/billing/invoices/queries"
import { useCan } from "@/modules/shared/rbac/use-can"
import { SharedPermission } from "@/modules/shared/rbac/permissions"

type InvoiceRef = { invoiceId: number; invoiceNo: string }

/**
 * Preview and print of one bill.
 *
 * - Preview opens the PDF marked "Preview" in a new tab; nothing is logged.
 * - Print logs the print and sends the PDF to the report printer. A bill printed before asks
 *   for a reason (on `REPRINT_REASON_REQUIRED`) and comes out as "Duplicate Copy".
 *
 * Render `reasonDialog` outside any dropdown menu, which unmounts its content when it closes.
 */
function useInvoicePrinting({ invoiceId, invoiceNo }: InvoiceRef) {
  const printInvoice = usePrintInvoice()
  const previewInvoice = usePreviewInvoice()
  const [askReason, setAskReason] = useState(false)

  function print(reprintReason?: string) {
    if (printInvoice.isPending) {
      return
    }
    printInvoice.mutate(
      { id: invoiceId, reprintReason },
      {
        onSuccess: (blob) => {
          setAskReason(false)
          void sendInvoiceToPrinter(blob, invoiceNo).then((printed) => {
            if (printed) {
              toast.success(`Bill ${invoiceNo} sent to the printer`)
            }
          })
        },
        onError: (error) => {
          if (hasErrorCode(error, ErrorCode.ReprintReasonRequired)) {
            setAskReason(true)
            return
          }
          toast.error(errorMessage(error, invoiceErrorMessages))
        },
      }
    )
  }

  function preview() {
    if (previewInvoice.isPending) {
      return
    }
    previewInvoice.mutate(invoiceId, {
      onSuccess: (blob) => {
        if (!openPdf(blob)) {
          toast.warning(`Preview of ${invoiceNo} is ready`, {
            description: "The browser blocked the new tab.",
            action: { label: "Open PDF", onClick: () => openPdf(blob) },
            duration: 15_000,
          })
        }
      },
      onError: (error) =>
        toast.error(errorMessage(error, invoiceErrorMessages)),
    })
  }

  const reasonDialog = (
    <ReasonDialog
      open={askReason}
      onOpenChange={setAskReason}
      title={`Print duplicate of ${invoiceNo}`}
      description="This bill was printed before. Enter why it is being printed again; it prints as “Duplicate Copy”."
      label="Reprint reason"
      confirmLabel="Print"
      pending={printInvoice.isPending}
      onConfirm={(reason) => print(reason)}
    />
  )

  return {
    print,
    preview,
    isPrinting: printInvoice.isPending,
    isPreviewing: previewInvoice.isPending,
    reasonDialog,
  }
}

/** Bill page header: Preview and (with the print permission) Print. */
export function InvoicePrintButtons(invoice: InvoiceRef) {
  const canPrint = useCan(SharedPermission.BillingPrint)
  const { print, preview, isPrinting, isPreviewing, reasonDialog } =
    useInvoicePrinting(invoice)

  return (
    <div className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={preview}
        disabled={isPreviewing}
      >
        {isPreviewing ? <Spinner /> : <FileSearchIcon />}
        Preview
      </Button>
      {canPrint ? (
        <Button type="button" onClick={() => print()} disabled={isPrinting}>
          {isPrinting ? <Spinner /> : <PrinterIcon />}
          Print
        </Button>
      ) : null}
      {reasonDialog}
    </div>
  )
}

/** Bill list row menu: View, Preview and (with the print permission) Print duplicate. */
export function InvoiceRowActions(invoice: InvoiceRef) {
  const canPrint = useCan(SharedPermission.BillingPrint)
  const { print, preview, reasonDialog } = useInvoicePrinting(invoice)

  return (
    <>
      <RowActions label={invoice.invoiceNo}>
        <ViewRowAction href={`/billing/invoices/${invoice.invoiceId}`} />
        <DropdownMenuItem onSelect={preview}>
          <EyeIcon />
          Preview
        </DropdownMenuItem>
        {canPrint ? (
          <DropdownMenuItem onSelect={() => print()}>
            <PrinterIcon />
            Print duplicate
          </DropdownMenuItem>
        ) : null}
      </RowActions>
      {reasonDialog}
    </>
  )
}
