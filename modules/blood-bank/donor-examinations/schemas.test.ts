import { describe, expect, it } from "vitest"

import { parseBloodPressure } from "@/modules/blood-bank/donor-examinations/format"
import {
  emptyExaminationValues,
  examinationSchema,
  toExaminationPayload,
  type ExaminationFormValues,
} from "@/modules/blood-bank/donor-examinations/schemas"

const valid: ExaminationFormValues = {
  weight_kg: "68.5",
  height_cm: "170.2",
  hemoglobin_g_dl: "13.8",
  pulse_bpm: "76",
  blood_pressure: "120/80",
  temperature_f: "98.4",
  accept: true,
  deferral_reason: "",
}

function issuePaths(values: ExaminationFormValues) {
  const result = examinationSchema.safeParse(values)
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join("."))
}

describe("examinationSchema", () => {
  it("accepts a complete form", () => {
    expect(issuePaths(valid)).toEqual([])
  })

  it("requires the measurements", () => {
    expect(issuePaths({ ...emptyExaminationValues, accept: true })).toEqual(
      expect.arrayContaining([
        "weight_kg",
        "hemoglobin_g_dl",
        "pulse_bpm",
        "blood_pressure",
        "temperature_f",
      ])
    )
  })

  it("checks decimals and ranges", () => {
    expect(issuePaths({ ...valid, weight_kg: "68.555" })).toEqual(["weight_kg"])
    expect(issuePaths({ ...valid, hemoglobin_g_dl: "26" })).toEqual([
      "hemoglobin_g_dl",
    ])
    expect(issuePaths({ ...valid, pulse_bpm: "76.5" })).toEqual(["pulse_bpm"])
    expect(issuePaths({ ...valid, temperature_f: "89" })).toEqual([
      "temperature_f",
    ])
  })

  it("keeps the diastolic pressure below the systolic one", () => {
    expect(issuePaths({ ...valid, blood_pressure: "80/120" })).toEqual([
      "blood_pressure",
    ])
    expect(issuePaths({ ...valid, blood_pressure: "120" })).toEqual([
      "blood_pressure",
    ])
  })

  it("makes the height optional but range-checked", () => {
    expect(issuePaths({ ...valid, height_cm: "" })).toEqual([])
    expect(issuePaths({ ...valid, height_cm: "40" })).toEqual(["height_cm"])
  })

  it("requires a reason when the donor is not accepted", () => {
    expect(issuePaths({ ...valid, accept: false })).toEqual(["deferral_reason"])
    expect(
      issuePaths({ ...valid, accept: false, deferral_reason: "Low Hb" })
    ).toEqual([])
  })
})

describe("toExaminationPayload", () => {
  it("sends JSON numbers, splits the pressure, sends no time and leaves out the unused reason", () => {
    expect(toExaminationPayload(valid)).toEqual({
      weight_kg: 68.5,
      height_cm: 170.2,
      hemoglobin_g_dl: 13.8,
      pulse_bpm: 76,
      bp_systolic: 120,
      bp_diastolic: 80,
      temperature_f: 98.4,
      decision: "accepted",
    })
  })

  it("defers with the reason when the switch is off", () => {
    expect(
      toExaminationPayload({
        ...valid,
        accept: false,
        deferral_reason: "Low Hb",
      })
    ).toMatchObject({ decision: "deferred", deferral_reason: "Low Hb" })
  })

  it("sends null for an empty height", () => {
    expect(
      toExaminationPayload({ ...valid, height_cm: "" })?.height_cm
    ).toBeNull()
  })
})

describe("parseBloodPressure", () => {
  it("reads a blood pressure", () => {
    expect(parseBloodPressure(" 120 / 80 ")).toEqual({
      systolic: 120,
      diastolic: 80,
    })
    expect(parseBloodPressure("12/8")).toBeNull()
  })
})
