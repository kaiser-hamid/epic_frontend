// @vitest-environment node
// Native fetch + Blob, as in the browser (jsdom's Blob is not a valid fetch body in Node).
import { http, HttpResponse } from "msw"
import { setupServer } from "msw/node"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"

import {
  PRINT_SERVICE_URLS,
  PrintServiceError,
  listPrinters,
  printBarcodeLabels,
  printCompatibilityReport,
  printServiceErrorText,
} from "@/lib/print-service"

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledFrame: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const pdf = new Blob(["%PDF-1.7"], { type: "application/pdf" })

type Seen = { url: URL; headers: Headers; body: string }

async function failure(): Promise<unknown> {
  return printCompatibilityReport(pdf, { jobName: "CTR-BB-0001.pdf" }).catch(
    (caught: unknown) => caught
  )
}

describe("printCompatibilityReport", () => {
  it("posts the raw PDF to the report printer at exact size", async () => {
    let seen: Seen | undefined
    server.use(
      http.post(PRINT_SERVICE_URLS.printPdf, async ({ request }) => {
        seen = {
          url: new URL(request.url),
          headers: request.headers,
          body: await request.text(),
        }
        return HttpResponse.json({
          printer: "report_printer",
          jobName: "CTR-BB-0001.pdf",
          pages: 2,
          copies: 1,
        })
      })
    )

    await expect(
      printCompatibilityReport(pdf, { jobName: "CTR-BB-0001.pdf" })
    ).resolves.toEqual({
      printer: "report_printer",
      jobName: "CTR-BB-0001.pdf",
      pages: 2,
      copies: 1,
    })
    expect(seen?.body).toBe("%PDF-1.7")
    expect(seen?.headers.get("content-type")).toBe("application/pdf")
    expect(seen?.headers.get("x-api-key")).toBe(
      "epichealthcare@2026printserver"
    )
    expect(seen?.headers.get("x-printer-name")).toBe("report_printer")
    expect(Object.fromEntries(seen?.url.searchParams ?? [])).toEqual({
      jobName: "CTR-BB-0001.pdf",
      exactSize: "true",
    })
  })

  it("reports a service that is not running", async () => {
    server.use(
      http.post(PRINT_SERVICE_URLS.printPdf, () => HttpResponse.error())
    )

    const error = await failure()
    expect(error).toBeInstanceOf(PrintServiceError)
    expect(printServiceErrorText(error)).toBe(
      "The print service is not running on this PC."
    )
  })

  it("maps problem responses to text", async () => {
    server.use(
      http.post(PRINT_SERVICE_URLS.printPdf, () =>
        HttpResponse.json(
          {
            title: "Unknown printer",
            status: 400,
            detail: "Check GET /api/v1/printers.",
          },
          { status: 400 }
        )
      )
    )
    expect(printServiceErrorText(await failure())).toBe(
      'Printer "report_printer" is not installed on this PC. Ask IT to check the printer name.'
    )

    server.use(
      http.post(PRINT_SERVICE_URLS.printPdf, () =>
        HttpResponse.json(
          { title: "Printer unavailable", status: 503, detail: "offline" },
          { status: 503 }
        )
      )
    )
    expect(printServiceErrorText(await failure())).toBe(
      "The printer is offline or unavailable."
    )

    server.use(
      http.post(PRINT_SERVICE_URLS.printPdf, () =>
        HttpResponse.json(
          { title: "Too large", status: 413, detail: "PDF is over 50 MB." },
          { status: 413 }
        )
      )
    )
    expect(printServiceErrorText(await failure())).toBe("PDF is over 50 MB.")
  })
})

describe("printBarcodeLabels", () => {
  it("posts the commands unchanged as raw text to the barcode printer", async () => {
    let seen: Seen | undefined
    server.use(
      http.post(PRINT_SERVICE_URLS.printRaw, async ({ request }) => {
        seen = {
          url: new URL(request.url),
          headers: request.headers,
          body: await request.text(),
        }
        return HttpResponse.json({
          printer: "barcode_printer",
          jobName: "Sample labels S1, S2",
          bytes: 16,
        })
      })
    )

    await printBarcodeLabels("^L\r\nE\r\n ^L\r\nE\r\n", {
      jobName: "Sample labels S1, S2",
    })

    expect(seen?.body).toBe("^L\r\nE\r\n ^L\r\nE\r\n")
    expect(seen?.headers.get("content-type")).toBe("text/plain; charset=utf-8")
    expect(seen?.headers.get("x-api-key")).toBe(
      "epichealthcare@2026printserver"
    )
    expect(seen?.headers.get("x-printer-name")).toBe("barcode_printer")
    expect(seen?.url.searchParams.get("jobName")).toBe("Sample labels S1, S2")
  })

  it("names the printer when it is not installed", async () => {
    server.use(
      http.post(PRINT_SERVICE_URLS.printRaw, () =>
        HttpResponse.json(
          { title: "Unknown printer", status: 400 },
          { status: 400 }
        )
      )
    )
    const error = await printBarcodeLabels("^L\r\nE\r\n").catch(
      (caught: unknown) => caught
    )

    expect(printServiceErrorText(error, "label")).toBe(
      'Printer "barcode_printer" is not installed on this PC. Ask IT to check the printer name.'
    )
  })
})

describe("listPrinters", () => {
  it("sends the API key", async () => {
    let key: string | null = null
    server.use(
      http.get(PRINT_SERVICE_URLS.printers, ({ request }) => {
        key = request.headers.get("x-api-key")
        return HttpResponse.json({ defaultPrinter: null, printers: [] })
      })
    )

    await expect(listPrinters()).resolves.toEqual({
      defaultPrinter: null,
      printers: [],
    })
    expect(key).toBe("epichealthcare@2026printserver")
  })
})
