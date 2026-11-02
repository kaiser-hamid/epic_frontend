import { afterEach, describe, expect, it, vi } from "vitest"

import { bloodCollectionLookup } from "@/modules/blood-bank/blood-collections/api"
import {
  collectBloodSchema,
  defaultCollectBloodValues,
  toCollectBloodPayload,
  type CollectBloodValues,
} from "@/modules/blood-bank/blood-collections/schemas"

function issuePaths(values: Partial<CollectBloodValues>) {
  const result = collectBloodSchema.safeParse({
    ...defaultCollectBloodValues,
    ...values,
  })
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join("."))
}

afterEach(() => {
  vi.useRealTimers()
})

describe("collectBloodSchema", () => {
  it("accepts the defaults (450 ml, collected now)", () => {
    expect(issuePaths({})).toEqual([])
  })

  it("requires a whole volume of 50–600 ml", () => {
    expect(issuePaths({ volume_ml: undefined })).toEqual(["volume_ml"])
    expect(issuePaths({ volume_ml: 49 })).toEqual(["volume_ml"])
    expect(issuePaths({ volume_ml: 601 })).toEqual(["volume_ml"])
    expect(issuePaths({ volume_ml: 50 })).toEqual([])
    expect(issuePaths({ volume_ml: 600 })).toEqual([])
  })

  it("refuses a collected time in the future", () => {
    vi.useFakeTimers()
    // 2026-11-02 10:00 in Dhaka (UTC+6).
    vi.setSystemTime(new Date("2026-11-02T04:00:00Z"))
    expect(issuePaths({ collected_at: "2026-11-02T10:00" })).toEqual([])
    expect(issuePaths({ collected_at: "2026-11-01T22:30" })).toEqual([])
    expect(issuePaths({ collected_at: "2026-11-02T10:01" })).toEqual([
      "collected_at",
    ])
  })
})

describe("toCollectBloodPayload", () => {
  it("sends null notes and time when left empty", () => {
    expect(toCollectBloodPayload(defaultCollectBloodValues)).toEqual({
      volume_ml: 450,
      notes: null,
      collected_at: null,
    })
  })

  it("reads the collected time as Dhaka wall time", () => {
    expect(
      toCollectBloodPayload({
        volume_ml: 350,
        notes: " clotted line ",
        collected_at: "2026-11-02T09:15",
      })
    ).toEqual({
      volume_ml: 350,
      notes: "clotted line",
      collected_at: "2026-11-02T03:15:00.000Z",
    })
  })
})

describe("bloodCollectionLookup", () => {
  it("treats a value starting with D as a donor no", () => {
    expect(bloodCollectionLookup(" D2611000012 ")).toEqual({
      donor_no: "D2611000012",
    })
    expect(bloodCollectionLookup("d26110001")).toEqual({
      donor_no: "d26110001",
    })
    expect(bloodCollectionLookup("NB2611020007")).toEqual({
      invoice_no: "NB2611020007",
    })
  })
})
