"use client"

import { PrinterIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { ReasonDialog } from "@/components/reason-dialog"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ErrorCode, errorMessage, hasErrorCode } from "@/lib/api-error"
import { invoiceErrorMessages } from "@/modules/shared/billing/invoices/error-messages"
import { usePrintInvoice } from "@/modules/shared/billing/invoices/queries"

/** How long an opened bill keeps its object URL (long enough to print or save from it). */
const PREVIEW_URL_LIFETIME_MS = 10 * 60 * 1000

/** Opens the PDF in a new tab (the browser's PDF viewer). False when the browser blocked it. */
function openPdf(blob: Blob): boolean {
  const url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }))
  const opened = window.open(url, "_blank")
  window.setTimeout(() => URL.revokeObjectURL(url), PREVIEW_URL_LIFETIME_MS)
  return opened !== null
}

/**
 * Logs the print, then opens the bill PDF to print from the browser. A bill printed before
 * asks for a reprint reason (on `REPRINT_REASON_REQUIRED`) and is marked "REPRINT".
 */
export function PrintInvoiceButton({
  invoiceId,
  invoiceNo,
}: {
  invoiceId: number
  invoiceNo: string
}) {
  const printInvoice = usePrintInvoice()
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
          if (!openPdf(blob)) {
            toast.warning(`Bill ${invoiceNo} is ready`, {
              description: "The browser blocked the new tab.",
              action: { label: "Open PDF", onClick: () => openPdf(blob) },
              duration: 15_000,
            })
          }
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

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => print()}
        disabled={printInvoice.isPending}
      >
        {printInvoice.isPending ? <Spinner /> : <PrinterIcon />}
        Print
      </Button>
      <ReasonDialog
        open={askReason}
        onOpenChange={setAskReason}
        title="Reprint bill"
        description="This bill was printed before. Enter why it is being reprinted."
        label="Reprint reason"
        confirmLabel="Print"
        pending={printInvoice.isPending}
        onConfirm={(reason) => print(reason)}
      />
    </>
  )
}
