import { toast } from "sonner"

import { openPdf } from "@/lib/open-pdf"
import {
  printCompatibilityReport,
  printServiceErrorText,
} from "@/lib/print-service"
import type { PdfFile } from "@/modules/blood-bank/blood-issue/types"

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
    await printCompatibilityReport(blob, { jobName: filename })
    return true
  } catch (error) {
    const reason = printServiceErrorText(error)
    const opened = openPdf(blob)
    toast.warning(`${filename} was not printed`, {
      description: opened
        ? `${reason} The report opened in a new tab; print it from there.`
        : `${reason} Open the report to print it from the browser.`,
      action: { label: "Open PDF", onClick: () => openPdf(blob) },
      duration: 15_000,
    })
    return false
  }
}
