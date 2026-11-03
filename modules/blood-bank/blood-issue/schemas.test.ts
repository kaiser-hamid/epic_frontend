import { describe, expect, it } from "vitest"

import {
  amendmentRequired,
  donorsNeedingVitals,
  donorsWithRecordedVitals,
  issueBloodDefaults,
  issueBloodSchema,
  reprintSchema,
  toIssueBloodPayload,
  type IssueBloodContext,
  type IssueBloodValues,
  type VitalsRowValues,
} from "@/modules/blood-bank/blood-issue/schemas"
import {
  bloodIssueView,
  issueDonor,
  issueUnit,
} from "@/modules/blood-bank/blood-issue/test-fixtures"

const recordedB: IssueBloodContext = { recordedBloodGroup: "B_POS" }

function vitals(overrides: Partial<VitalsRowValues> = {}): VitalsRowValues {
  return {
    case_donor_id: 101,
    pulse_bpm: 80,
    bp_systolic: 120,
    bp_diastolic: 80,
    temperature_f: "98.4",
    ...overrides,
  }
}

function values(overrides: Partial<IssueBloodValues> = {}): IssueBloodValues {
  return {
    patient_blood_group: "B_POS",
    amendment_reason: "",
    technologist_id: 5,
    physician_id: 9,
    units: [
      {
        unit_id: 11,
        major_result: "compatible",
        minor_result: "compatible",
        remarks: "",
      },
    ],
    post_donation: [vitals()],
    ...overrides,
  }
}

function issuePaths(
  input: IssueBloodValues,
  context: IssueBloodContext = recordedB
): string[] {
  const result = issueBloodSchema(context).safeParse(input)
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join("."))
}

describe("issueBloodSchema", () => {
  it("accepts a complete form", () => {
    expect(issuePaths(values())).toEqual([])
  })

  it("requires both crossmatch results and both signers, with no default", () => {
    expect(
      issuePaths(
        values({
          technologist_id: undefined,
          physician_id: undefined,
          units: [
            { unit_id: 11, major_result: "", minor_result: "", remarks: "" },
          ],
        })
      ).sort()
    ).toEqual([
      "physician_id",
      "technologist_id",
      "units.0.major_result",
      "units.0.minor_result",
    ])
  })

  it("refuses an incompatible unit", () => {
    expect(
      issuePaths(
        values({
          units: [
            {
              unit_id: 11,
              major_result: "compatible",
              minor_result: "incompatible",
              remarks: "",
            },
          ],
        })
      )
    ).toEqual(["units.0.minor_result"])
  })

  it("checks the vitals ranges", () => {
    expect(
      issuePaths(values({ post_donation: [vitals({ pulse_bpm: 19 })] }))
    ).toEqual(["post_donation.0.pulse_bpm"])
    expect(
      issuePaths(values({ post_donation: [vitals({ bp_systolic: 301 })] }))
    ).toEqual(["post_donation.0.bp_systolic"])
    expect(
      issuePaths(values({ post_donation: [vitals({ temperature_f: "89.9" })] }))
    ).toEqual(["post_donation.0.temperature_f"])
    expect(
      issuePaths(
        values({ post_donation: [vitals({ temperature_f: "98.45" })] })
      )
    ).toEqual(["post_donation.0.temperature_f"])
    expect(
      issuePaths(
        values({
          post_donation: [
            vitals({
              pulse_bpm: undefined,
              bp_diastolic: undefined,
              temperature_f: "",
            }),
          ],
        })
      ).sort()
    ).toEqual([
      "post_donation.0.bp_diastolic",
      "post_donation.0.pulse_bpm",
      "post_donation.0.temperature_f",
    ])
  })

  it("needs the diastolic pressure below the systolic", () => {
    expect(
      issuePaths(
        values({
          post_donation: [vitals({ bp_systolic: 110, bp_diastolic: 110 })],
        })
      )
    ).toEqual(["post_donation.0.bp_diastolic"])
  })

  it("requires the blood group only until one is recorded", () => {
    expect(
      issuePaths(values({ patient_blood_group: "" }), {
        recordedBloodGroup: null,
      })
    ).toEqual(["patient_blood_group"])
    expect(issuePaths(values({ patient_blood_group: "" }), recordedB)).toEqual(
      []
    )
  })

  it("requires an amendment reason only when a recorded blood group changes", () => {
    // First entry: no reason.
    expect(
      issuePaths(values({ patient_blood_group: "A_POS" }), {
        recordedBloodGroup: null,
      })
    ).toEqual([])
    // Unchanged: no reason.
    expect(issuePaths(values({ patient_blood_group: "B_POS" }))).toEqual([])
    // Changed: reason required.
    expect(issuePaths(values({ patient_blood_group: "A_POS" }))).toEqual([
      "amendment_reason",
    ])
    expect(
      issuePaths(
        values({ patient_blood_group: "A_POS", amendment_reason: "Retested" })
      )
    ).toEqual([])
  })

  it("requires an amendment reason when a unit is crossmatched again", () => {
    expect(
      amendmentRequired(values(), { ...recordedB, crossmatchedUnitIds: [11] })
    ).toBe(true)
    expect(
      amendmentRequired(values(), { ...recordedB, crossmatchedUnitIds: [12] })
    ).toBe(false)
  })
})

describe("donor vitals", () => {
  const view = bloodIssueView()

  it("asks only for donors that need them and whose unit is selected", () => {
    const selected = [issueUnit(11, 1), issueUnit(13, 3)]
    expect(
      donorsNeedingVitals(view.donors, selected).map((donor) => donor.number)
    ).toEqual(["D0001"])
    expect(
      donorsWithRecordedVitals(view.donors, selected).map(
        (donor) => donor.number
      )
    ).toEqual(["D0003"])
  })

  it("matches a unit to its donor by bag no when the donor no differs", () => {
    const donors = [issueDonor(1, { number: "D-OTHER" })]
    expect(
      donorsNeedingVitals(donors, [issueUnit(11, 1)]).map(
        (donor) => donor.case_donor_id
      )
    ).toEqual([101])
  })

  it("prefills the recorded group and one vitals row per donor that needs them", () => {
    const defaults = issueBloodDefaults(view, [
      issueUnit(11, 1),
      issueUnit(12, 2),
    ])
    expect(defaults.patient_blood_group).toBe("B_POS")
    expect(defaults.units.map((row) => row.major_result)).toEqual(["", ""])
    expect(defaults.post_donation.map((row) => row.case_donor_id)).toEqual([
      101, 102,
    ])
  })
})

describe("toIssueBloodPayload", () => {
  it("sends an unchanged recorded group as null and parses the vitals", () => {
    const output = issueBloodSchema(recordedB).parse(values())
    expect(toIssueBloodPayload(output, recordedB)).toEqual({
      technologist_id: 5,
      physician_id: 9,
      patient_blood_group: null,
      amendment_reason: null,
      units: [
        {
          unit_id: 11,
          major_result: "compatible",
          minor_result: "compatible",
          remarks: null,
        },
      ],
      post_donation: [
        {
          case_donor_id: 101,
          pulse_bpm: 80,
          bp_systolic: 120,
          bp_diastolic: 80,
          temperature_f: 98.4,
        },
      ],
    })
  })

  it("sends a changed group with its amendment reason", () => {
    const output = issueBloodSchema(recordedB).parse(
      values({ patient_blood_group: "A_POS", amendment_reason: " Retested " })
    )
    expect(toIssueBloodPayload(output, recordedB)).toMatchObject({
      patient_blood_group: "A_POS",
      amendment_reason: "Retested",
    })
  })
})

describe("reprintSchema", () => {
  it("requires a reason and a unit", () => {
    const result = reprintSchema.safeParse({
      unit_ids: [],
      reprint_reason: " ",
    })
    expect(
      result.success ? [] : result.error.issues.map((issue) => issue.path[0])
    ).toEqual(["unit_ids", "reprint_reason"])
  })
})
