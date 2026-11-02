import { describe, expect, it } from "vitest"

import { toAddDonorPayload } from "@/modules/blood-bank/case-donors/api"
import {
  addDonorErrorPath,
  addDonorSchema,
  emptyAddDonorValues,
  type AddDonorValues,
} from "@/modules/blood-bank/case-donors/schemas"
import { emptyNewDonor } from "@/modules/blood-bank/cases/schemas"

const newDonor: AddDonorValues = {
  invoice_no: "NB2611020007",
  donors: [{ donor: { ...emptyNewDonor, name: "Rahim", age: 30 } }],
}

const returning: AddDonorValues = {
  invoice_no: "NB2611020007",
  donors: [{ donor_id: 12, donor: { ...emptyNewDonor, name: "Karim" } }],
}

function issuePaths(values: AddDonorValues, existing: number[] = []) {
  const result = addDonorSchema(new Set(existing)).safeParse(values)
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join("."))
}

describe("addDonorSchema", () => {
  it("accepts a new or a returning donor", () => {
    expect(issuePaths(newDonor)).toEqual([])
    expect(issuePaths(returning)).toEqual([])
  })

  it("requires a letters-and-digits invoice no of at most 30", () => {
    expect(issuePaths({ ...newDonor, invoice_no: "" })).toEqual(["invoice_no"])
    expect(issuePaths({ ...newDonor, invoice_no: "NB-26/1" })).toEqual([
      "invoice_no",
    ])
    expect(issuePaths({ ...newDonor, invoice_no: "A".repeat(31) })).toEqual([
      "invoice_no",
    ])
  })

  it("requires a new donor's name and age or date of birth", () => {
    expect(issuePaths({ ...emptyAddDonorValues, invoice_no: "NB1" })).toEqual([
      "donors.0.donor.name",
      "donors.0.donor.age",
    ])
  })

  it("refuses a donor already on the case", () => {
    expect(issuePaths(returning, [12])).toEqual(["donors.0.donor_id"])
  })
})

describe("toAddDonorPayload", () => {
  it("sends donor_id for a returning donor, never the donor fields", () => {
    expect(toAddDonorPayload(returning)).toEqual({
      invoice_no: "NB2611020007",
      donor_id: 12,
    })
  })

  it("sends the donor object for a new donor", () => {
    const payload = toAddDonorPayload(newDonor)
    expect(payload).not.toHaveProperty("donor_id")
    expect(payload).toMatchObject({
      invoice_no: "NB2611020007",
      donor: { name: "Rahim", age: 30, is_regular_volunteer: null },
    })
  })
})

describe("addDonorErrorPath", () => {
  it("moves donor errors onto the form's single donor entry", () => {
    expect(addDonorErrorPath("invoice_no")).toBe("invoice_no")
    expect(addDonorErrorPath("donor_id")).toBe("donors.0.donor_id")
    expect(addDonorErrorPath("donor.name")).toBe("donors.0.donor.name")
  })
})
