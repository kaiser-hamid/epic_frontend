/**
 * The Windows print service that runs on each workstation. It prints a Compatibility Test
 * Report PDF on the printer named "report_print" at exact size (no scaling, no margins, aligned
 * to the paper edge) and takes the paper size from the PDF page, so the request carries no
 * printer, paper or layout options.
 */
export const PRINT_SERVICE_URL =
  "http://127.0.0.1:9555/api/v1/print-compatibility-test"

/** Fixed key the print service expects; it only guards a loopback port, not user data. */
const PRINT_SERVICE_API_KEY = "epichealthcare@2026printserver"

const JOB_NAME_MAX = 128

/** What the service answers once the job is spooled. */
export type PrintJob = {
  printer: string
  jobName: string
  pages: number
  copies: number
}

/** A failed print. `status` is null when the service could not be reached at all. */
export class PrintServiceError extends Error {
  readonly status: number | null

  constructor(status: number | null, message: string) {
    super(message)
    this.name = "PrintServiceError"
    this.status = status
  }
}

/** RFC 7807 `detail` (or `title`) from an error response, if it has one. */
async function problemDetail(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json()
    if (typeof body === "object" && body !== null) {
      const { detail, title } = body as Record<string, unknown>
      if (typeof detail === "string" && detail) return detail
      if (typeof title === "string" && title) return title
    }
  } catch {
    // Not JSON: fall back to the status text below.
  }
  return null
}

/**
 * Sends a Compatibility Test Report PDF to the print service as the raw request body. Every
 * report print goes through this one function. Resolves once the job is spooled; rejects with a
 * `PrintServiceError` when the service is not running or refuses the job.
 */
export async function printCompatibilityReport(
  blob: Blob,
  filename: string,
  { copies = 1 }: { copies?: number } = {}
): Promise<PrintJob> {
  const url = new URL(PRINT_SERVICE_URL)
  url.searchParams.set("jobName", filename.slice(0, JOB_NAME_MAX))
  if (copies !== 1) {
    url.searchParams.set("copies", String(copies))
  }

  let response: Response
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/pdf",
        "X-Api-Key": PRINT_SERVICE_API_KEY,
      },
      body: blob,
    })
  } catch {
    throw new PrintServiceError(null, "The print service is not running.")
  }

  if (!response.ok) {
    throw new PrintServiceError(
      response.status,
      (await problemDetail(response)) ??
        `Print service answered ${response.status}.`
    )
  }
  return (await response.json()) as PrintJob
}

const printServiceMessages: Partial<Record<number, string>> = {
  400: "The report PDF is invalid.",
  401: "The print service rejected the API key.",
  403: "The print service only accepts requests from a page opened on localhost.",
  413: "The report is too large to print (over 50 MB).",
  415: "The print service did not accept the file type.",
  503: 'The printer "report_print" is not installed or not available.',
}

/** UI text for a failed print. */
export function printServiceErrorText(error: unknown): string {
  if (error instanceof PrintServiceError) {
    if (error.status === null) {
      return "The print service is not running on this computer."
    }
    return printServiceMessages[error.status] ?? error.message
  }
  return "The report could not be printed."
}
