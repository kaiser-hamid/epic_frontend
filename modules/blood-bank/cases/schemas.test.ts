import { describe, expect, it } from "vitest"

import {
  caseCreateSchema,
  emptyNewDonor,
  emptyNewPatient,
  type CaseCreateValues,
} from "@/modules/blood-bank/cases/schemas"

const valid: CaseCreateValues = {
  billing: {
    patient: { ...emptyNewPatient, name: "Rahim Uddin", age_years: 40 },
    items: [{ test_item_id: 12, quantity: 1 }],
    referral: { is_self_referral: false, doctor_id: 3, remark: "" },
  },
  care_type: "daycare",
  transfusion_reason: "",
  reference_note: "",
  components: [{ component_type_id: 2 }],
  donors: [{ donor_id: 41, donor: emptyNewDonor }],
}

function issuePaths(values: unknown) {
  const result = caseCreateSchema.safeParse(values)
  return result.success ? [] : result.error.issues.map((issue) => issue.path)
}

describe("caseCreateSchema", () => {
  it("accepts a valid registration", () => {
    expect(issuePaths(valid)).toEqual([])
  })

  it("requires at least one donor", () => {
    expect(issuePaths({ ...valid, donors: [] })).toEqual([["donors"]])
  })

  it("requires the age or date of birth of a new patient", () => {
    const patient = { ...valid.billing.patient, age_years: undefined }
    expect(
      issuePaths({ ...valid, billing: { ...valid.billing, patient } })
    ).toEqual([["billing", "patient", "age_years"]])

    const withBirthDate = { ...patient, date_of_birth: "1986-08-18" }
    expect(
      issuePaths({
        ...valid,
        billing: { ...valid.billing, patient: withBirthDate },
      })
    ).toEqual([])
  })

  it("skips the new-patient rules once the phone lookup found the patient", () => {
    const billing = { ...valid.billing, patient: emptyNewPatient }
    expect(issuePaths({ ...valid, billing })).toEqual([
      ["billing", "patient", "name"],
      ["billing", "patient", "age_years"],
    ])
    expect(
      issuePaths({ ...valid, billing: { ...billing, patient_id: 7 } })
    ).toEqual([])
  })

  it("accepts digits only in a phone", () => {
    const patient = { ...valid.billing.patient, phone: "01711-000000" }
    expect(
      issuePaths({ ...valid, billing: { ...valid.billing, patient } })
    ).toEqual([["billing", "patient", "phone"]])
  })

  it("requires a doctor unless the patient is self-referred", () => {
    const referral = { is_self_referral: false, remark: "" }
    expect(
      issuePaths({ ...valid, billing: { ...valid.billing, referral } })
    ).toEqual([["billing", "referral", "doctor_id"]])
    expect(
      issuePaths({
        ...valid,
        billing: {
          ...valid.billing,
          referral: { ...referral, is_self_referral: true },
        },
      })
    ).toEqual([])
  })

  it("flags the duplicated row, not the first one", () => {
    expect(
      issuePaths({
        ...valid,
        components: [{ component_type_id: 2 }, { component_type_id: 2 }],
        donors: [
          { donor_id: 41, donor: emptyNewDonor },
          { donor: { ...emptyNewDonor, name: "Karim", age: 28 } },
          { donor_id: 41, donor: emptyNewDonor },
        ],
      })
    ).toEqual([
      ["components", 1, "component_type_id"],
      ["donors", 2, "donor_id"],
    ])
  })

  it("requires the name and age (or date of birth) of a new donor only", () => {
    expect(
      issuePaths({
        ...valid,
        donors: [
          { donor: { ...emptyNewDonor, name: "Karim" } },
          { donor: emptyNewDonor },
          { donor_id: 41, donor: emptyNewDonor },
        ],
      })
    ).toEqual([
      ["donors", 0, "donor", "age"],
      ["donors", 1, "donor", "name"],
      ["donors", 1, "donor", "age"],
    ])
  })
})
