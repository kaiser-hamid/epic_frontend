import { afterEach, describe, expect, it, vi } from "vitest"

import { isExpiringSoon } from "@/modules/blood-bank/units/format"
import {
  canShowReserve,
  canToggleReserve,
  defaultPrepareValues,
  PreparationMode,
  preparationRequirement,
  prepareUnitsSchema,
  RequirementKind,
  toPrepareUnitsPayload,
  type PrepareUnitsValues,
  type UnitRowValues,
} from "@/modules/blood-bank/units/schemas"
import type { PreparationComponent } from "@/modules/blood-bank/units/types"

const WB = { id: 1, code: "WB", name: "Whole Blood" }
const PCV = 2
const FP = 3

function line(
  componentTypeId: number,
  code: string,
  quantity: number,
  held: number
): PreparationComponent {
  return {
    component_type_id: componentTypeId,
    code,
    name: code,
    quantity,
    held_count: held,
    needed_count: Math.max(quantity - held, 0),
  }
}

// PCV: billed 2, held 1, needed 1. FP: billed 1, held 1, needed 0.
const components = [line(PCV, "PCV", 2, 1), line(FP, "FP", 1, 1)]

const schema = prepareUnitsSchema({
  components,
  collectedAt: "2026-11-02T09:00:00+06:00",
  wholeBloodId: WB.id,
})

function row(
  componentTypeId: number,
  // `location: null` means none chosen (a default would replace `undefined`).
  { forCase = false, location = 7 as number | null } = {}
): UnitRowValues {
  return {
    component_type_id: componentTypeId,
    storage_location_id: location ?? undefined,
    volume_ml: undefined,
    for_case: forCase,
    locked: false,
  }
}

function issuePaths(values: Partial<PrepareUnitsValues>) {
  const result = schema.safeParse({
    mode: PreparationMode.Separate,
    units: [row(PCV)],
    prepared_at: "",
    ...values,
  })
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join("."))
}

afterEach(() => {
  vi.useRealTimers()
})

describe("preparationRequirement", () => {
  it("forces whole blood when only whole blood is needed", () => {
    const requirement = preparationRequirement(
      [line(WB.id, "WB", 1, 0), line(FP, "FP", 1, 1)],
      WB
    )
    expect(requirement.kind).toBe(RequirementKind.WholeBlood)
    expect(requirement.modes).toEqual([PreparationMode.WholeBlood])
  })

  it("forces separating when only components are needed", () => {
    const requirement = preparationRequirement(components, WB)
    expect(requirement.kind).toBe(RequirementKind.Components)
    expect(requirement.modes).toEqual([PreparationMode.Separate])
    expect(requirement.neededComponents.map((c) => c.code)).toEqual(["PCV"])
  })

  it("lets staff choose when whole blood and a component are both needed", () => {
    const requirement = preparationRequirement(
      [line(WB.id, "WB", 1, 0), line(PCV, "PCV", 1, 0)],
      WB
    )
    expect(requirement.kind).toBe(RequirementKind.Either)
    expect(requirement.modes).toHaveLength(2)
  })

  it("allows both modes, all to stock, when nothing is needed", () => {
    const requirement = preparationRequirement([line(FP, "FP", 1, 1)], WB)
    expect(requirement.kind).toBe(RequirementKind.None)
    expect(requirement.modes).toHaveLength(2)
  })
})

describe("defaultPrepareValues", () => {
  it("pre-fills one locked patient row per needed component", () => {
    const requirement = preparationRequirement(components, WB)
    expect(defaultPrepareValues(requirement, WB)).toMatchObject({
      mode: PreparationMode.Separate,
      units: [{ component_type_id: PCV, for_case: true, locked: true }],
    })
  })

  it("pre-fills a locked whole-blood patient row when whole blood is needed", () => {
    const requirement = preparationRequirement([line(WB.id, "WB", 1, 0)], WB)
    expect(defaultPrepareValues(requirement, WB)).toMatchObject({
      mode: PreparationMode.WholeBlood,
      units: [{ component_type_id: WB.id, for_case: true, locked: true }],
    })
  })

  it("starts with one blank stock row when nothing is needed", () => {
    const requirement = preparationRequirement([line(FP, "FP", 1, 1)], WB)
    expect(defaultPrepareValues(requirement, WB).units).toEqual([
      expect.objectContaining({ for_case: false, locked: false }),
    ])
  })
})

describe("prepareUnitsSchema", () => {
  it("needs a location for a stock unit, not for a patient unit", () => {
    expect(issuePaths({ units: [row(PCV, { location: null })] })).toEqual([
      "units.0.storage_location_id",
    ])
    expect(
      issuePaths({ units: [row(PCV, { forCase: true, location: null })] })
    ).toEqual([])
  })

  it("never reserves more of a component than the case still needs", () => {
    expect(
      issuePaths({
        units: [row(PCV, { forCase: true }), row(PCV, { forCase: true })],
      })
    ).toEqual(["units.1.for_case"])
    expect(issuePaths({ units: [row(FP, { forCase: true })] })).toEqual([
      "units.0.for_case",
    ])
  })

  it("refuses whole blood combined with components", () => {
    expect(issuePaths({ units: [row(WB.id), row(PCV)] })).toEqual(["units"])
  })

  it("keeps prepared at between the collection and now", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-11-02T06:00:00Z")) // 12:00 Dhaka
    expect(issuePaths({ prepared_at: "2026-11-02T10:30" })).toEqual([])
    expect(issuePaths({ prepared_at: "2026-11-02T08:59" })).toEqual([
      "prepared_at",
    ])
    expect(issuePaths({ prepared_at: "2026-11-02T12:01" })).toEqual([
      "prepared_at",
    ])
  })
})

describe("For this patient switch", () => {
  it("shows only for a component the case still needs", () => {
    expect(canShowReserve(components, PCV)).toBe(true)
    expect(canShowReserve(components, FP)).toBe(false)
    expect(canShowReserve(components, undefined)).toBe(false)
  })

  it("is locked on pre-filled rows and capped by the needed count", () => {
    const locked = { ...row(PCV, { forCase: true }), locked: true }
    expect(canToggleReserve(components, [locked], 0)).toBe(false)
    expect(canToggleReserve(components, [locked, row(PCV)], 1)).toBe(false)
    expect(canToggleReserve(components, [row(PCV)], 0)).toBe(true)
  })
})

describe("toPrepareUnitsPayload", () => {
  it("sends the location and volume only when given, and prepared at as UTC", () => {
    expect(
      toPrepareUnitsPayload({
        mode: PreparationMode.Separate,
        units: [
          { ...row(PCV, { forCase: true, location: null }), locked: true },
          { ...row(FP), volume_ml: 220 },
        ],
        prepared_at: "2026-11-02T10:30",
      })
    ).toEqual({
      units: [
        { component_type_id: PCV, for_case: true },
        {
          component_type_id: FP,
          storage_location_id: 7,
          volume_ml: 220,
          for_case: false,
        },
      ],
      prepared_at: "2026-11-02T04:30:00.000Z",
    })
  })
})

describe("isExpiringSoon", () => {
  const now = Date.parse("2026-11-02T00:00:00Z")
  it("flags units expiring within 3 days, or already expired", () => {
    expect(isExpiringSoon("2026-11-04T23:00:00Z", now)).toBe(true)
    expect(isExpiringSoon("2026-11-01T00:00:00Z", now)).toBe(true)
    expect(isExpiringSoon("2026-11-06T00:00:00Z", now)).toBe(false)
  })
})
