import { http, HttpResponse } from "msw"
import { setupServer } from "msw/node"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"

import { readBlobErrorBody } from "@/lib/api-client"
import { ApiError } from "@/lib/api-error"
import {
  bloodIssueLookup,
  filenameFromDisposition,
  issueBlood,
} from "@/modules/blood-bank/blood-issue/api"
import type { IssueBloodInput } from "@/modules/blood-bank/blood-issue/types"

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledFrame: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const input: IssueBloodInput = {
  technologist_id: 5,
  physician_id: 9,
  patient_blood_group: null,
  amendment_reason: null,
  units: [
    {
      unit_id: 41,
      major_result: "compatible",
      minor_result: "compatible",
      remarks: null,
    },
  ],
  post_donation: [],
}

describe("readBlobErrorBody", () => {
  it("turns a JSON error inside a Blob into its body", async () => {
    const blob = new Blob(
      [
        JSON.stringify({
          message: "The given data was invalid.",
          code: "VALIDATION_FAILED",
          errors: { technologist_id: ["Unknown user."] },
        }),
      ],
      { type: "application/json" }
    )
    expect(await readBlobErrorBody(blob)).toEqual({
      message: "The given data was invalid.",
      code: "VALIDATION_FAILED",
      errors: { technologist_id: ["Unknown user."] },
    })
  })

  it("gives an empty body for anything that is not a JSON object", async () => {
    expect(await readBlobErrorBody(new Blob(["<html>500</html>"]))).toEqual({})
    expect(await readBlobErrorBody(new Blob(["[1]"]))).toEqual({})
  })
})

describe("issueBlood", () => {
  it("returns the PDF and the file name from Content-Disposition", async () => {
    server.use(
      http.post("/api/blood-bank/cases/1/blood-issue", () =>
        HttpResponse.arrayBuffer(new TextEncoder().encode("%PDF-1.7").buffer, {
          status: 201,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": 'inline; filename="CTR-BB-0001.pdf"',
          },
        })
      )
    )

    const pdf = await issueBlood(1, input)
    expect(pdf.filename).toBe("CTR-BB-0001.pdf")
    expect(await pdf.blob.text()).toBe("%PDF-1.7")
  })

  it("reads a JSON error that arrives as a Blob into a typed ApiError", async () => {
    server.use(
      http.post("/api/blood-bank/cases/1/blood-issue", () =>
        HttpResponse.json(
          {
            message: "Incompatible.",
            code: "CROSSMATCH_INCOMPATIBLE",
            unit_no: "U-41",
          },
          { status: 422 }
        )
      )
    )

    const error = await issueBlood(1, input).catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 422,
      code: "CROSSMATCH_INCOMPATIBLE",
      message: "Incompatible.",
      context: { unit_no: "U-41" },
    })
  })

  it("keeps validation errors for the form", async () => {
    server.use(
      http.post("/api/blood-bank/cases/1/blood-issue", () =>
        HttpResponse.json(
          {
            message: "Invalid.",
            code: "VALIDATION_FAILED",
            errors: { "post_donation.0.bp_diastolic": ["Too high."] },
          },
          { status: 422 }
        )
      )
    )

    const error = await issueBlood(1, input).catch((caught: unknown) => caught)
    expect(error).toMatchObject({
      code: "VALIDATION_FAILED",
      errors: { "post_donation.0.bp_diastolic": ["Too high."] },
    })
  })
})

describe("scan helpers", () => {
  it("sends a D-number as donor_no and anything else as invoice_no", () => {
    expect(bloodIssueLookup(" D000123 ")).toEqual({ donor_no: "D000123" })
    expect(bloodIssueLookup("INV-77")).toEqual({ invoice_no: "INV-77" })
  })

  it("falls back when there is no file name", () => {
    expect(filenameFromDisposition(undefined, "CTR-1.pdf")).toBe("CTR-1.pdf")
    expect(filenameFromDisposition("inline", "CTR-1.pdf")).toBe("CTR-1.pdf")
  })
})
