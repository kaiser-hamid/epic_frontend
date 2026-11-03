import { toast } from "sonner"

import { printCompatibilityReport } from "@/modules/blood-bank/blood-issue/print"
import type { PdfFile } from "@/modules/blood-bank/blood-issue/types"

/**
 * Hands a report PDF to the print service. The print is already logged by the backend, so a
 * failure only warns: the user can send it again with Reprint.
 */
export async function sendReportToPrinter({
  blob,
  filename,
}: PdfFile): Promise<void> {
  try {
    await printCompatibilityReport(blob, filename)
  } catch {
    toast.warning(
      `${filename} could not be sent to the printer. Check the print service, then use Reprint.`
    )
  }
}
