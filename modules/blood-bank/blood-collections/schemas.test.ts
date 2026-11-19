import { afterEach, describe, expect, it, vi } from "vitest"

import { bloodCollectionLookup } from "@/modules/blood-bank/blood-collections/api"
import {
  collectBloodSchema,
  defaultCollectBloodValues,
  toCollectBloodPayload,
  type CollectBloodValues,
} from "@/modules/blood-bank/blood-collections/schemas"
import type { BagPlanRow } from "@/modules/blood-bank/blood-collections/types"
import type { StorageLocation } from "@/modules/blood-bank/storage-locations/types"

/** A PCV case's bag: PCV for the patient, FFP to the freezer. */
const plan: BagPlanRow[] = [
  {
    component_type_id: 2,
    code: "PCV",
    name: "Packed Cell Volume",
    for_patient: true,
    needs_storage_location: false,
    default_location_type: "refrigerator",
  },
  {
    component_type_id: 3,
    code: "FFP",
    name: "Fresh Frozen Plasma",
    for_patient: false,
    needs_storage_location: true,
    default_location_type: "freezer",
  },
]

const locations: StorageLocation[] = [
  {
    id: 7,
    code: "R1",
    name: "Fridge 1",
    type: "refrigerator",
    min_temperature_c: null,
    max_temperature_c: null,
  },
  {
    id: 9,
    code: "F1",
    name: "Freezer 1",
    type: "freezer",
    min_temperature_c: null,
    max_temperature_c: null,
  },
]

const defaults = defaultCollectBloodValues(plan, locations)

function issuePaths(values: Partial<CollectBloodValues>) {
  const result = collectBloodSchema.safeParse({ ...defaults, ...values })
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join("."))
}

afterEach(() => {
  vi.useRealTimers()
})

describe("defaultCollectBloodValues", () => {
  it("pre-fills a storage row's shelf from its usual location type, not a patient row's", () => {
    expect(
      defaults.units.map((row) => [row.code, row.storage_location_id])
    ).toEqual([
      ["PCV", undefined],
      ["FFP", 9],
    ])
  })
})

describe("collectBloodSchema", () => {
  it("accepts the defaults (collected now, no volumes)", () => {
    expect(issuePaths({})).toEqual([])
  })

  it("requires a shelf for a unit that is stored", () => {
    expect(
      issuePaths({
        units: defaults.units.map((row) => ({
          ...row,
          storage_location_id: undefined,
        })),
      })
    ).toEqual(["units.1.storage_location_id"])
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
  it("sends null notes, time, shelf and volume when left empty", () => {
    expect(toCollectBloodPayload(defaults)).toEqual({
      notes: null,
      collected_at: null,
      units: [
        { component_type_id: 2, storage_location_id: null, volume_ml: null },
        { component_type_id: 3, storage_location_id: 9, volume_ml: null },
      ],
    })
  })

  it("reads the collected time as Dhaka wall time", () => {
    expect(
      toCollectBloodPayload({
        ...defaults,
        notes: " clotted line ",
        collected_at: "2026-11-02T09:15",
      })
    ).toMatchObject({
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
