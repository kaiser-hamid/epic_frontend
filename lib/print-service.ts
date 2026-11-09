"use client"

import { publicEnv } from "@/lib/public-env"

/**
 * Client for the Windows print service on each workstation (loopback only, so it is called from
 * the browser, never from server code). The caller names the printer in the `X-Printer-Name`
 * header:
 *
 * - `POST /print/pdf`: a PDF, paper size taken from each page. Compatibility Test Reports
 *   (letterhead, 215 × 292 mm) and bills (pre-printed pad, A5 148 × 210 mm) go to the report
 *   printer at exact size (no scaling, aligned to the paper edge).
 * - `POST /print/raw`: printer commands (GoDEX EZPL) passed to the printer byte for byte.
 *   Sample barcode labels go to the label printer. No `copies`: reprints go through the backend.
 *
 * The service only allows the request headers `X-Api-Key`, `X-Printer-Name` and `Content-Type`.
 */
const PRINT_SERVICE_BASE_URL = `${publicEnv.printServiceUrl}/api/v1`

export const PRINT_SERVICE_URLS = {
  printers: `${PRINT_SERVICE_BASE_URL}/printers`,
  printPdf: `${PRINT_SERVICE_BASE_URL}/print/pdf`,
  printRaw: `${PRINT_SERVICE_BASE_URL}/print/raw`,
} as const

export const REPORT_PRINTER = publicEnv.reportPrinter
export const BARCODE_PRINTER = publicEnv.barcodePrinter
export const LABEL_PRINTER = publicEnv.labelPrinter

const JOB_NAME_MAX = 128

/** What the service answers once a PDF is spooled. */
export type PrintJob = {
  printer: string
  jobName: string
  pages: number
  copies: number
}

/** What the service answers once raw printer data is spooled. */
export type RawPrintJob = {
  printer: string
  jobName: string
  bytes: number
}

export type PrinterInfo = {
  name: string
  isDefault: boolean
  status: string
  isOffline: boolean
  isNetwork: boolean
}

export type PrinterList = {
  defaultPrinter: string | null
  printers: PrinterInfo[]
}

/**
 * A failed print. `status` is null when the service could not be reached at all; `title` and
 * `detail` come from the `application/problem+json` response. `printer` is the printer the job
 * was meant for, when there was one.
 */
export class PrintServiceError extends Error {
  readonly status: number | null
  readonly title: string
  readonly detail: string
  readonly printer: string | null

  constructor(
    status: number | null,
    title: string,
    detail: string,
    printer: string | null = null
  ) {
    super(detail || title)
    this.name = "PrintServiceError"
    this.status = status
    this.title = title
    this.detail = detail
    this.printer = printer
  }
}

/** RFC 7807 `title` and `detail` from an error response; empty strings when it has none. */
async function readProblem(
  response: Response
): Promise<{ title: string; detail: string }> {
  try {
    const body: unknown = await response.json()
    if (typeof body === "object" && body !== null) {
      const { title, detail } = body as Record<string, unknown>
      return {
        title: typeof title === "string" ? title : "",
        detail: typeof detail === "string" ? detail : "",
      }
    }
  } catch {
    // Not JSON: the caller falls back to the status.
  }
  return { title: "", detail: "" }
}

/** Calls the print service; rejects with `PrintServiceError` on any failure. */
async function request<T>(
  url: URL | string,
  init: RequestInit,
  printer: string | null
): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, init)
  } catch {
    // fetch rejects with a TypeError ("Failed to fetch") when nothing listens on the port.
    throw new PrintServiceError(
      null,
      "Print service not running",
      "Print service is not running on this PC",
      printer
    )
  }

  if (!response.ok) {
    const { title, detail } = await readProblem(response)
    throw new PrintServiceError(
      response.status,
      title || response.statusText || "Print failed",
      detail || `Print service answered ${response.status}.`,
      printer
    )
  }
  return (await response.json()) as T
}

function printUrl(
  endpoint: string,
  params: Record<string, string | undefined>
): URL {
  const url = new URL(endpoint)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, value)
  }
  return url
}

/** The printers installed on this PC. */
export async function listPrinters(): Promise<PrinterList> {
  return request<PrinterList>(
    PRINT_SERVICE_URLS.printers,
    { headers: { "X-Api-Key": publicEnv.printApiKey } },
    null
  )
}

/**
 * Sends a PDF (the raw bytes, not multipart) to the named printer. Resolves once the job is
 * spooled.
 */
export async function printPdf(
  pdf: Blob,
  printer: string,
  {
    copies = 1,
    jobName,
    exactSize,
  }: { copies?: number; jobName?: string; exactSize?: boolean } = {}
): Promise<PrintJob> {
  const url = printUrl(PRINT_SERVICE_URLS.printPdf, {
    copies: copies !== 1 ? String(copies) : undefined,
    jobName: jobName?.slice(0, JOB_NAME_MAX),
    exactSize: exactSize ? "true" : undefined,
  })
  return request<PrintJob>(
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/pdf",
        "X-Api-Key": publicEnv.printApiKey,
        "X-Printer-Name": printer,
      },
      body: pdf,
    },
    printer
  )
}

/**
 * Sends printer commands to the named printer exactly as the backend produced them (`\r\n` kept;
 * never trim or re-encode). Resolves once the job is spooled.
 */
export async function printRaw(
  data: string,
  printer: string,
  { jobName }: { jobName?: string } = {}
): Promise<RawPrintJob> {
  const url = printUrl(PRINT_SERVICE_URLS.printRaw, {
    jobName: jobName?.slice(0, JOB_NAME_MAX),
  })
  return request<RawPrintJob>(
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Api-Key": publicEnv.printApiKey,
        "X-Printer-Name": printer,
      },
      body: data,
    },
    printer
  )
}

/** A Compatibility Test Report PDF on the letterhead printer, printed 1:1. */
export function printCompatibilityReport(
  pdf: Blob,
  opts: { copies?: number; jobName?: string } = {}
): Promise<PrintJob> {
  return printPdf(pdf, REPORT_PRINTER, { ...opts, exactSize: true })
}

/** A bill PDF (Customer Copy + Non Lab Copies) on the report printer's pad, printed 1:1. */
export function printInvoiceCopies(
  pdf: Blob,
  opts: { jobName?: string } = {}
): Promise<PrintJob> {
  return printPdf(pdf, REPORT_PRINTER, { ...opts, exactSize: true })
}

/** Sample label commands (several labels concatenated into one job) on the barcode printer. */
export function printBarcodeLabels(
  ezpl: string,
  opts: { jobName?: string } = {}
): Promise<RawPrintJob> {
  return printRaw(ezpl, BARCODE_PRINTER, opts)
}

/** Blood bag and component label commands (one job, labels concatenated) on the label printer. */
export function printBagLabels(
  ezpl: string,
  opts: { jobName?: string } = {}
): Promise<RawPrintJob> {
  return printRaw(ezpl, LABEL_PRINTER, opts)
}

/** Which printer a failed job was meant for; it only shapes the fallback text. */
export type PrintTarget = "report" | "label"

const commonMessages: Partial<Record<number, string>> = {
  401: "The print service rejected the API key.",
  403: "The print service only accepts requests from a page opened on localhost.",
}

/** UI text for a failed print. */
export function printServiceErrorText(
  error: unknown,
  target: PrintTarget = "report"
): string {
  if (error instanceof PrintServiceError) {
    const { status, title, detail, printer } = error
    if (status === null) {
      return "The print service is not running on this PC."
    }
    if (status === 400 && title === "Unknown printer") {
      return `Printer "${printer ?? "(unknown)"}" is not installed on this PC. Ask IT to check the printer name.`
    }
    if (status === 503) {
      return "The printer is offline or unavailable."
    }
    if (status === 400 || status === 413 || status === 415) {
      return detail
    }
    return commonMessages[status] ?? detail
  }
  return target === "label"
    ? "The labels could not be printed."
    : "The report could not be printed."
}
