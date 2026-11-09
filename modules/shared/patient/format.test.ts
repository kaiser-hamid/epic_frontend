import { describe, expect, it } from "vitest"

import { formatAge } from "@/modules/shared/patient/format"

describe("formatAge", () => {
  it.each([
    ["years, ignoring months and days", 78, 4, 12, "78Y"],
    ["months when under a year", 0, 5, 20, "5M"],
    ["days when under a month", 0, 0, 22, "22D"],
    ["years only (a donor)", 34, undefined, undefined, "34Y"],
    ["born today", 0, 0, 0, "0D"],
    ["unknown", null, null, null, null],
  ])("%s", (_, years, months, days, label) => {
    expect(formatAge(years, months, days)).toBe(label)
  })
})
