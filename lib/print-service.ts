/**
 * The Windows print service that runs on each workstation (loopback only). Each endpoint prints
 * on a printer with a fixed name, so requests carry no printer, paper or layout options:
 *
 * - Compatibility Test Report PDFs on "report_print", at exact size (no scaling, no margins,
 *   aligned to the paper edge), paper size taken from the PDF page.
 * - Sample barcode labels on "label_print" (the 38 x 25 mm GoDEX), as raw printer commands
 *   (GoDEX EZPL) passed to the printer byte for byte.
 */
const PRINT_SERVICE_BASE_URL = "http://127.0.0.1:9555/api/v1"

export const PRINT_SERVICE_URLS = {
  compatibilityReport: `${PRINT_SERVICE_BASE_URL}/print-compatibility-test`,
  sampleLabels: `${PRINT_SERVICE_BASE_URL}/print-sample-label`,
} as const

/** Fixed key the print service expects; it only guards a loopback port, not user data. */
const PRINT_SERVICE_API_KEY = "epichealthcare@2026printserver"

const JOB_NAME_MAX = 128

/** What the service answers once a report is spooled. */
export type PrintJob = {
  printer: string
  jobName: string
  pages: number
  copies: number
}

/** What the service answers once raw label data is spooled. */
export type RawPrintJob = {
  printer: string
  jobName: string
  bytes: number
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

/** Posts a raw body to a print endpoint; rejects with `PrintServiceError` on any failure. */
async function send<T>(
  url: URL,
  contentType: string,
  body: BodyInit
): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": contentType,
        "X-Api-Key": PRINT_SERVICE_API_KEY,
      },
      body,
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
  return (await response.json()) as T
}

function jobUrl(endpoint: string, jobName: string): URL {
  const url = new URL(endpoint)
  url.searchParams.set("jobName", jobName.slice(0, JOB_NAME_MAX))
  return url
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
  const url = jobUrl(PRINT_SERVICE_URLS.compatibilityReport, filename)
  if (copies !== 1) {
    url.searchParams.set("copies", String(copies))
  }
  return send<PrintJob>(url, "application/pdf", blob)
}

/**
 * Sends label printer commands (as the backend rendered them, `\r\n` line endings intact) to the
 * label printer as one job. Several labels are simply concatenated. Rejects with a
 * `PrintServiceError` when the service is not running or refuses the job.
 */
export async function printLabelCommands(
  commands: string[],
  jobName: string
): Promise<RawPrintJob> {
  return send<RawPrintJob>(
    jobUrl(PRINT_SERVICE_URLS.sampleLabels, jobName),
    "text/plain; charset=utf-8",
    commands.join("")
  )
}

/** Which printer a failed job was meant for; it changes what some statuses mean. */
export type PrintTarget = "report" | "label"

const printServiceMessages: Record<
  PrintTarget,
  Partial<Record<number, string>>
> = {
  report: {
    400: "The report PDF is invalid.",
    413: "The report is too large to print (over 50 MB).",
    503: 'The printer "report_print" is not installed or not available.',
  },
  label: {
    400: "The label data is empty or invalid.",
    413: "Too many labels for one print job.",
    503: 'The label printer "label_print" is not installed or not available.',
  },
}

const commonMessages: Partial<Record<number, string>> = {
  401: "The print service rejected the API key.",
  403: "The print service only accepts requests from a page opened on localhost.",
  415: "The print service did not accept the file type.",
}

/** UI text for a failed print. */
export function printServiceErrorText(
  error: unknown,
  target: PrintTarget = "report"
): string {
  if (error instanceof PrintServiceError) {
    if (error.status === null) {
      return "The print service is not running on this computer."
    }
    return (
      printServiceMessages[target][error.status] ??
      commonMessages[error.status] ??
      error.message
    )
  }
  return target === "label"
    ? "The labels could not be printed."
    : "The report could not be printed."
}
