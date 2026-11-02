import { describe, expect, it } from "vitest"

import { serologyLookup } from "@/modules/blood-bank/donor-serology/api"
import { serologyLockReason } from "@/modules/blood-bank/donor-serology/lock-reason"
import {
  emptySerologyValues,
  serologyDefaults,
  serologySchema,
  toSerologyPayload,
  type SerologyFormValues,
} from "@/modules/blood-bank/donor-serology/schemas"
import type {
  SerologyDonor,
  SerologyResults,
} from "@/modules/blood-bank/donor-serology/types"

const valid: SerologyFormValues = {
  blood_group: "B_POS",
  hbsag: "non_reactive",
  anti_hcv: "non_reactive",
  anti_hiv: "non_reactive",
  syphilis: "non_reactive",
  decision: "accepted",
  deferral_reason: "",
}

const saved: SerologyResults = {
  blood_group: "B_POS",
  hbsag: "non_reactive",
  anti_hcv: "non_reactive",
  anti_hiv: "non_reactive",
  syphilis: "non_reactive",
  version: 1,
  tested_at: "2026-11-02T10:00:00+06:00",
  tested_by: { id: 1, name: "Lab" },
}

const donor: SerologyDonor = {
  subject_type: "donor",
  case_donor_id: 7,
  case_donor_status: "fit",
  sequence_no: 1,
  number: "D-1",
  name: "Donor",
  age: 30,
  gender: "male",
  blood_group: null,
  phone: null,
  sample: {
    id: 1,
    sample_no: "S2611020001",
    status: "collected",
    collected_at: "2026-11-02T09:00:00+06:00",
  },
  serology: null,
  decision: null,
  deferral_reason: null,
  assessed_at: null,
  assessed_by: null,
  can_record: true,
}

function issuePaths(values: SerologyFormValues) {
  const result = serologySchema.safeParse(values)
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join("."))
}

describe("serologySchema", () => {
  it("accepts a complete form", () => {
    expect(issuePaths(valid)).toEqual([])
  })

  it("requires every choice", () => {
    expect(issuePaths(emptySerologyValues)).toEqual(
      expect.arrayContaining([
        "blood_group",
        "hbsag",
        "anti_hcv",
        "anti_hiv",
        "syphilis",
        "decision",
      ])
    )
  })

  it("never accepts a reactive donor", () => {
    expect(issuePaths({ ...valid, anti_hiv: "reactive" })).toEqual(["decision"])
  })

  it("requires a deferral reason only for a deferral", () => {
    expect(issuePaths({ ...valid, decision: "deferred" })).toEqual([
      "deferral_reason",
    ])
    expect(
      issuePaths({ ...valid, decision: "deferred", deferral_reason: "Low" })
    ).toEqual([])
  })
})

describe("toSerologyPayload", () => {
  it("drops the deferral reason with Accept", () => {
    expect(toSerologyPayload({ ...valid, deferral_reason: "old" })).toEqual({
      blood_group: "B_POS",
      hbsag: "non_reactive",
      anti_hcv: "non_reactive",
      anti_hiv: "non_reactive",
      syphilis: "non_reactive",
      decision: "accepted",
    })
  })

  it("sends the deferral reason with Defer", () => {
    expect(
      toSerologyPayload({
        ...valid,
        hbsag: "reactive",
        decision: "deferred",
        deferral_reason: " HBsAg reactive ",
      })
    ).toMatchObject({
      hbsag: "reactive",
      decision: "deferred",
      deferral_reason: "HBsAg reactive",
    })
  })
})

describe("serologyDefaults", () => {
  it("prefills the deferral reason only for a serology deferral", () => {
    expect(
      serologyDefaults({
        ...donor,
        serology: saved,
        decision: "accepted",
        deferral_reason: "stale",
      }).deferral_reason
    ).toBe("")
    expect(
      serologyDefaults({
        ...donor,
        serology: saved,
        decision: "deferred",
        deferral_reason: "Reactive",
      })
    ).toMatchObject({ decision: "deferred", deferral_reason: "Reactive" })
  })
})

describe("serologyLookup", () => {
  it("sends a sample no for values starting with S, else an invoice no", () => {
    expect(serologyLookup(" S2611020001 ")).toEqual({
      sample_no: "S2611020001",
    })
    expect(serologyLookup("NB2611020001")).toEqual({
      invoice_no: "NB2611020001",
    })
  })
})

describe("serologyLockReason", () => {
  it("explains why the backend refuses recording", () => {
    const locked = { ...donor, can_record: false }
    expect(serologyLockReason(donor, "open")).toBeNull()
    expect(serologyLockReason(locked, "closed")).toBe("Case closed")
    expect(
      serologyLockReason({ ...locked, case_donor_status: "registered" }, "open")
    ).toBe("Awaiting physical examination")
    expect(
      serologyLockReason(
        { ...locked, case_donor_status: "deferred", deferral_reason: "Low Hb" },
        "open"
      )
    ).toBe("Deferred at physical examination: Low Hb")
    expect(serologyLockReason({ ...locked, sample: null }, "open")).toBe(
      "Awaiting sample collection"
    )
    expect(
      serologyLockReason(
        { ...locked, case_donor_status: "collected", serology: saved },
        "open"
      )
    ).toBe("Bag collected — locked")
  })
})
