/**
 * The local print service (a C# Windows service on the workstation, still to be built) that
 * sends PDFs straight to the letterhead printer. Until it exists this endpoint is a
 * placeholder; change it here only.
 */
export const PRINT_SERVICE_URL = "http://localhost:9100/print"

/**
 * Sends a Compatibility Test Report PDF to the print service. The PDF already has one page per
 * unit laid out for the 215 × 292 mm pre-printed letterhead, so it must be printed as is: no
 * scaling, no added margins. Every report print goes through this one function.
 *
 * Multipart, so the browser needs no CORS preflight. Rejects when the service is unreachable or
 * answers with an error; the report is already logged as printed by then, so the caller only
 * warns (a Reprint sends it again).
 */
export async function printCompatibilityReport(
  blob: Blob,
  filename: string
): Promise<void> {
  const body = new FormData()
  body.append("file", blob, filename)
  body.append("document_type", "bb.compatibility_report")
  body.append("paper", "215x292mm")
  body.append("scaling", "none")
  body.append("margins", "none")

  const response = await fetch(PRINT_SERVICE_URL, { method: "POST", body })
  if (!response.ok) {
    throw new Error(`Print service answered ${response.status}.`)
  }
}
