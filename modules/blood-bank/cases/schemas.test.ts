import { describe, expect, it } from "vitest"

import {
  caseCreateSchema,
  emptyNewDonor,
  emptyNewPatient,
  type CaseCreateValues,
} from "@/modules/blood-bank/cases/schemas"

const valid: CaseCreateValues = {
  patient_mode: "new",
  billing: {
    patient: { ...emptyNewPatient, name: "Rahim Uddin", age_years: 40 },
    items: [{ test_item_id: 12, quantity: 1 }],
    referral: { is_self_referral: false, doctor_id: 3, remark: "" },
  },
  care_type: "daycare",
  transfusion_reason: "",
  reference_note: "",
  components: [{ component_type_id: 2, quantity: 2 }],
  donors: [],
}

function issuePaths(values: unknown) {
  const result = caseCreateSchema.safeParse(values)
  return result.success ? [] : result.error.issues.map((issue) => issue.path)
}

describe("caseCreateSchema", () => {
  it("accepts a valid registration", () => {
    expect(issuePaths(valid)).toEqual([])
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

  it("requires a selected patient in returning-patient mode, ignoring the new-patient fields", () => {
    const billing = { ...valid.billing, patient: emptyNewPatient }
    expect(issuePaths({ ...valid, patient_mode: "existing", billing })).toEqual(
      [["billing", "patient_id"]]
    )
    expect(
      issuePaths({
        ...valid,
        patient_mode: "existing",
        billing: { ...billing, patient_id: 7 },
      })
    ).toEqual([])
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
        components: [
          { component_type_id: 2, quantity: 2 },
          { component_type_id: 2, quantity: 1 },
        ],
        donors: [
          { kind: "existing", donor_id: 41 },
          { kind: "new", donor: { ...emptyNewDonor, name: "Karim", age: 28 } },
          { kind: "existing", donor_id: 41 },
        ],
      })
    ).toEqual([
      ["components", 1, "component_type_id"],
      ["donors", 2, "donor_id"],
    ])
  })

  it("requires the age or date of birth of a new donor", () => {
    expect(
      issuePaths({
        ...valid,
        donors: [{ kind: "new", donor: { ...emptyNewDonor, name: "Karim" } }],
      })
    ).toEqual([["donors", 0, "donor", "age"]])
  })
})
