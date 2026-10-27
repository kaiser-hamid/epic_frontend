import { describe, expect, it } from "vitest"

import { formatDateTime, formatTaka } from "@/lib/format"

describe("formatTaka", () => {
  it("formats integer paisa with lakh grouping", () => {
    expect(formatTaka(12345650)).toBe("৳1,23,456.50")
    expect(formatTaka(-5)).toBe("-৳0.05")
  })

  it("rejects non-integer money", () => {
    expect(() => formatTaka(10.5)).toThrow()
  })
})

describe("formatDateTime", () => {
  it("displays in Asia/Dhaka regardless of the machine timezone", () => {
    expect(formatDateTime("2026-10-27T20:30:00Z")).toBe("28 Oct 2026, 02:30")
  })
})
