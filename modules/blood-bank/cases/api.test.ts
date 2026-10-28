import { describe, expect, it } from "vitest"

import { toRegisterCasePayload } from "@/modules/blood-bank/cases/api"
import {
  emptyNewDonor,
  emptyNewPatient,
  type CaseCreateValues,
} from "@/modules/blood-bank/cases/schemas"

const values: CaseCreateValues = {
  patient_mode: "new",
  billing: {
    patient_id: 9,
    patient: { ...emptyNewPatient, name: "Rahim Uddin", age_years: 40 },
    items: [{ test_item_id: 12, quantity: 1 }],
    referral: { is_self_referral: false, doctor_id: 3, remark: "" },
  },
  care_type: "daycare",
  transfusion_reason: "",
  reference_note: "",
  components: [],
  donors: [
    { kind: "existing", donor_id: 41 },
    { kind: "new", donor: { ...emptyNewDonor, name: "Karim Mia", age: 28 } },
  ],
}

/** Round-trips through JSON like the request body, so `undefined` keys disappear. */
function body(input: CaseCreateValues) {
  return JSON.parse(JSON.stringify(toRegisterCasePayload(input)))
}

describe("toRegisterCasePayload", () => {
  it("sends only the new patient in new-patient mode, with empty optionals as null", () => {
    const { billing } = body(values)
    expect(billing).not.toHaveProperty("patient_id")
    expect(billing.patient).toMatchObject({
      name: "Rahim Uddin",
      age_years: 40,
      gender: null,
      phone: null,
    })
    expect(billing.patient).not.toHaveProperty("age_months")
  })

  it("sends only patient_id for a returning patient", () => {
    const { billing } = body({ ...values, patient_mode: "existing" })
    expect(billing.patient_id).toBe(9)
    expect(billing).not.toHaveProperty("patient")
  })

  it("drops the doctor on a self referral", () => {
    const { billing } = body({
      ...values,
      billing: {
        ...values.billing,
        referral: { ...values.billing.referral, is_self_referral: true },
      },
    })
    expect(billing.referral).not.toHaveProperty("doctor_id")
    expect(billing.referral.is_self_referral).toBe(true)
  })

  it("sends donor_id or donor per donor, without the UI kind", () => {
    const { donors } = body(values)
    expect(donors[0]).toEqual({ donor_id: 41 })
    expect(Object.keys(donors[1])).toEqual(["donor"])
    expect(donors[1].donor).toMatchObject({ name: "Karim Mia", age: 28 })
  })
})
