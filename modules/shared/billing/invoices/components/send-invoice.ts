"use client"

import { toast } from "sonner"

import { errorMessage } from "@/lib/api-error"
import { openPdf } from "@/lib/open-pdf"
import { printInvoiceCopies, printServiceErrorText } from "@/lib/print-service"
import { printInvoice } from "@/modules/shared/billing/invoices/api"
import { invoiceErrorMessages } from "@/modules/shared/billing/invoices/error-messages"

/**
 * Hands a bill PDF to the print service (the report printer, 1:1 on the pad). The print is
 * already logged by the backend, so a failure doesn't undo anything: the PDF opens in a new tab
 * to print from there (or, when the browser blocks the tab, the warning offers "Open PDF").
 * Resolves to whether the service printed it.
 */
export async function sendInvoiceToPrinter(
  blob: Blob,
  invoiceNo: string
): Promise<boolean> {
  const jobName = `INV-${invoiceNo}`
  try {
    await printInvoiceCopies(blob, { jobName })
    return true
  } catch (error) {
    const reason = printServiceErrorText(error)
    const opened = openPdf(blob)
    toast.warning(`Bill ${invoiceNo} was not printed`, {
      description: opened
        ? `${reason} The bill opened in a new tab; print it from there.`
        : `${reason} Open the bill to print it from the browser.`,
      action: { label: "Open PDF", onClick: () => openPdf(blob) },
      duration: 15_000,
    })
    return false
  }
}

/**
 * Prints a bill just saved (its "Original Copy"). Runs on after the form has moved on to the
 * bill page, so it reports through toasts only; a failure leaves the bill saved and printable
 * from its page.
 */
export async function printSavedInvoice(
  invoiceId: number,
  invoiceNo: string
): Promise<void> {
  let blob: Blob
  try {
    blob = await printInvoice({ id: invoiceId })
  } catch (error) {
    toast.error(`Bill ${invoiceNo} saved but not printed`, {
      description: `${errorMessage(error, invoiceErrorMessages)} Print it from the bill page.`,
      duration: 15_000,
    })
    return
  }
  await sendInvoiceToPrinter(blob, invoiceNo)
}
