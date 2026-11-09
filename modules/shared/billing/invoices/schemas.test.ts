import { describe, expect, it } from "vitest"

import {
  emptyNewPatient,
  invoiceCategory,
  invoiceSchema,
  type InvoiceValues,
} from "@/modules/shared/billing/invoices/schemas"
import type { TestItem } from "@/modules/shared/test-catalog/types"

const valid: InvoiceValues = {
  invoice_no: "",
  patient: { ...emptyNewPatient, name: "Rahim Uddin", age_years: 40 },
  items: [{ test_item_id: 12, quantity: 1 }],
  referral: { is_self_referral: false, doctor_id: 3, remark: "" },
  patient_type_id: 1,
  category_details: {},
}

function issuePaths(values: unknown) {
  const result = invoiceSchema.safeParse(values)
  return result.success ? [] : result.error.issues.map((issue) => issue.path)
}

function testItem(category: TestItem["category"]): TestItem {
  return {
    id: 1,
    code: "T1",
    name: "Test",
    department_id: 1,
    department_name: null,
    category,
    rate: 10000,
    discount_percent: null,
  }
}

describe("invoiceSchema", () => {
  it("accepts a valid bill", () => {
    expect(issuePaths(valid)).toEqual([])
  })

  it("requires the age or date of birth of a new patient", () => {
    const patient = { ...valid.patient, age_years: undefined }
    expect(issuePaths({ ...valid, patient })).toEqual([
      ["patient", "age_years"],
    ])
    expect(
      issuePaths({
        ...valid,
        patient: { ...patient, date_of_birth: "1986-08-18" },
      })
    ).toEqual([])
  })

  it("skips the new-patient rules once the phone lookup found the patient", () => {
    expect(issuePaths({ ...valid, patient: emptyNewPatient })).toEqual([
      ["patient", "name"],
      ["patient", "age_years"],
    ])
    expect(
      issuePaths({ ...valid, patient: emptyNewPatient, patient_id: 7 })
    ).toEqual([])
  })

  it("requires a doctor unless the patient is self-referred", () => {
    const referral = { is_self_referral: false, remark: "" }
    expect(issuePaths({ ...valid, referral })).toEqual([
      ["referral", "doctor_id"],
    ])
    expect(
      issuePaths({
        ...valid,
        referral: { ...referral, is_self_referral: true },
      })
    ).toEqual([])
  })

  it("requires a patient type", () => {
    expect(issuePaths({ ...valid, patient_type_id: undefined })).toEqual([
      ["patient_type_id"],
    ])
  })

  it("flags a repeated test on its second row", () => {
    expect(
      issuePaths({
        ...valid,
        items: [
          { test_item_id: 12, quantity: 1 },
          { test_item_id: 12, quantity: 1 },
        ],
      })
    ).toEqual([["items", 1, "test_item_id"]])
  })

  it("takes only letters and digits in a typed invoice no", () => {
    expect(issuePaths({ ...valid, invoice_no: "NB-26/1" })).toEqual([
      ["invoice_no"],
    ])
  })
})

describe("invoiceCategory", () => {
  it("is Blood Bank as soon as one Blood Bank item is picked", () => {
    expect(invoiceCategory([{ item: testItem("general") }, {}])).toBe("general")
    expect(invoiceCategory([{ item: testItem("blood_bank") }, {}])).toBe(
      "blood_bank"
    )
  })
})
