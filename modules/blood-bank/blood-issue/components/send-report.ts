import { toast } from "sonner"

import {
  printCompatibilityReport,
  printServiceErrorText,
} from "@/lib/print-service"
import type { PdfFile } from "@/modules/blood-bank/blood-issue/types"

/** How long an opened preview keeps its object URL (long enough to print or save from it). */
const PREVIEW_URL_LIFETIME_MS = 10 * 60 * 1000

/**
 * Opens the PDF in a new tab (the browser's PDF viewer) so the user can print or save it by
 * hand. Returns false when the browser blocked the tab, e.g. because the click that started the
 * print was too long ago.
 */
function openPdfPreview(blob: Blob): boolean {
  const url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }))
  const opened = window.open(url, "_blank")
  window.setTimeout(() => URL.revokeObjectURL(url), PREVIEW_URL_LIFETIME_MS)
  return opened !== null
}

/**
 * Hands a report PDF to the print service. The print is already logged by the backend, so a
 * failure doesn't undo anything: the report opens in a new tab for the user to print from there
 * (or, when the browser blocks the tab, the warning offers an "Open PDF" button). Resolves to
 * whether the service printed it.
 */
export async function sendReportToPrinter({
  blob,
  filename,
}: PdfFile): Promise<boolean> {
  try {
    await printCompatibilityReport(blob, filename)
    return true
  } catch (error) {
    const reason = printServiceErrorText(error)
    const opened = openPdfPreview(blob)
    toast.warning(`${filename} was not printed`, {
      description: opened
        ? `${reason} The report opened in a new tab; print it from there.`
        : `${reason} Open the report to print it from the browser.`,
      action: { label: "Open PDF", onClick: () => openPdfPreview(blob) },
      duration: 15_000,
    })
    return false
  }
}
