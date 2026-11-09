import { describe, expect, it } from "vitest"

import { toCreateInvoicePayload } from "@/modules/shared/billing/invoices/api"
import {
  emptyNewPatient,
  type InvoiceValues,
} from "@/modules/shared/billing/invoices/schemas"
import type { TestItem } from "@/modules/shared/test-catalog/types"

const bloodBankItem: TestItem = {
  id: 30,
  code: "BB-003",
  name: "Packed Red Cells",
  department_id: 4,
  department_name: "Blood Bank",
  category: "blood_bank",
  rate: 150000,
  discount_percent: null,
}

const values: InvoiceValues = {
  invoice_no: "",
  patient: { ...emptyNewPatient, name: "Rahim Uddin", age_years: 40 },
  items: [{ test_item_id: 12, quantity: 1 }],
  referral: { is_self_referral: false, doctor_id: 3, remark: "" },
  patient_type_id: 1,
  category_details: { care_type: "daycare" },
}

/** Round-trips through JSON like the request body, so `undefined` keys disappear. */
function body(input: InvoiceValues) {
  return JSON.parse(JSON.stringify(toCreateInvoicePayload(input, "key-1")))
}

describe("toCreateInvoicePayload", () => {
  it("sends only the new patient when none was found, with empty optionals as null", () => {
    const sent = body(values)
    expect(sent).not.toHaveProperty("patient_id")
    expect(sent.patient).toMatchObject({
      name: "Rahim Uddin",
      age_years: 40,
      gender: null,
      phone: null,
    })
    expect(sent.idempotency_key).toBe("key-1")
    expect(sent).not.toHaveProperty("invoice_no")
  })

  it("sends only patient_id for a found patient and drops the doctor on a self referral", () => {
    const sent = body({
      ...values,
      patient_id: 9,
      referral: { ...values.referral, is_self_referral: true },
    })
    expect(sent.patient_id).toBe(9)
    expect(sent).not.toHaveProperty("patient")
    expect(sent.referral).not.toHaveProperty("doctor_id")
  })

  it("sends category details only on a Blood Bank bill, without empty values", () => {
    expect(body(values)).not.toHaveProperty("category_details")

    const items = [{ test_item_id: 30, quantity: 2, item: bloodBankItem }]
    expect(body({ ...values, items })).toMatchObject({
      items: [{ test_item_id: 30, quantity: 2 }],
      category_details: { care_type: "daycare" },
    })
    expect(
      body({ ...values, items, category_details: { care_type: "" } })
        .category_details
    ).toEqual({})
  })
})
