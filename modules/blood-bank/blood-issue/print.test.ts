// @vitest-environment node
// Native fetch + Blob, as in the browser (jsdom's Blob is not a valid fetch body in Node).
import { http, HttpResponse } from "msw"
import { setupServer } from "msw/node"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"

import {
  PRINT_SERVICE_URL,
  printCompatibilityReport,
  printServiceErrorText,
} from "@/modules/blood-bank/blood-issue/print"

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledFrame: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const pdf = new Blob(["%PDF-1.7"], { type: "application/pdf" })

async function failure(): Promise<unknown> {
  return printCompatibilityReport(pdf, "CTR-BB-0001.pdf").catch(
    (caught: unknown) => caught
  )
}

describe("printCompatibilityReport", () => {
  it("posts the raw PDF with the API key and the job name", async () => {
    let seen: { url: URL; headers: Headers; body: string } | undefined
    server.use(
      http.post(PRINT_SERVICE_URL, async ({ request }) => {
        seen = {
          url: new URL(request.url),
          headers: request.headers,
          body: await request.text(),
        }
        return HttpResponse.json({
          printer: "report_print",
          jobName: "CTR-BB-0001.pdf",
          pages: 2,
          copies: 1,
        })
      })
    )

    await expect(
      printCompatibilityReport(pdf, "CTR-BB-0001.pdf")
    ).resolves.toEqual({
      printer: "report_print",
      jobName: "CTR-BB-0001.pdf",
      pages: 2,
      copies: 1,
    })
    expect(seen?.body).toBe("%PDF-1.7")
    expect(seen?.headers.get("content-type")).toBe("application/pdf")
    expect(seen?.headers.get("x-api-key")).toBe(
      "epichealthcare@2026printserver"
    )
    expect(Object.fromEntries(seen?.url.searchParams ?? [])).toEqual({
      jobName: "CTR-BB-0001.pdf",
    })
  })

  it("reports a service that is not running", async () => {
    server.use(http.post(PRINT_SERVICE_URL, () => HttpResponse.error()))

    expect(printServiceErrorText(await failure())).toBe(
      "The print service is not running on this computer."
    )
  })

  it("maps problem responses to text by status", async () => {
    server.use(
      http.post(PRINT_SERVICE_URL, () =>
        HttpResponse.json(
          {
            title: "Printer unavailable",
            status: 503,
            detail: "report_print is offline",
          },
          { status: 503 }
        )
      )
    )
    expect(printServiceErrorText(await failure())).toBe(
      'The printer "report_print" is not installed or not available.'
    )

    server.use(
      http.post(PRINT_SERVICE_URL, () =>
        HttpResponse.json(
          { title: "Teapot", status: 418, detail: "Short and stout." },
          { status: 418 }
        )
      )
    )
    expect(printServiceErrorText(await failure())).toBe("Short and stout.")
  })
})
