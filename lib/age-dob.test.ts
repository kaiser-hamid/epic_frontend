import { describe, expect, it } from "vitest"

import { ageFromDob, dobFromAge } from "@/lib/age-dob"

const today = "2026-11-01"

describe("dobFromAge", () => {
  it("counts back from today for years, years + months and years + months + days", () => {
    expect(dobFromAge({ years: 26 }, today)).toBe("2000-11-01")
    expect(dobFromAge({ years: 26, months: 3 }, today)).toBe("2000-08-01")
    expect(dobFromAge({ years: 26, months: 3, days: 5 }, today)).toBe(
      "2000-07-27"
    )
  })

  it("is empty when no part is given", () => {
    expect(dobFromAge({}, today)).toBe("")
  })
})

describe("ageFromDob", () => {
  it("returns years, months and days", () => {
    expect(ageFromDob("2000-07-27", today)).toEqual({
      years: 26,
      months: 3,
      days: 5,
    })
  })

  it("round-trips an age", () => {
    const dob = dobFromAge({ years: 40, months: 2, days: 10 }, today)
    expect(ageFromDob(dob, today)).toEqual({ years: 40, months: 2, days: 10 })
  })

  it("ignores incomplete, future and implausible dates", () => {
    expect(ageFromDob("20/08", today)).toBeNull()
    expect(ageFromDob("2027-01-01", today)).toBeNull()
    expect(ageFromDob("1800-01-01", today)).toBeNull()
  })
})
