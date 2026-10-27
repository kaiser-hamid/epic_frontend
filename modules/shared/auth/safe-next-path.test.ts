import { describe, expect, it } from "vitest"

import { safeNextPath } from "@/modules/shared/auth/safe-next-path"

describe("safeNextPath", () => {
  it("keeps same-origin paths", () => {
    expect(safeNextPath("/blood-bank/cases?status=open")).toBe(
      "/blood-bank/cases?status=open"
    )
  })

  it("rejects external and protocol-relative redirects", () => {
    expect(safeNextPath("https://evil.example")).toBe("/")
    expect(safeNextPath("//evil.example")).toBe("/")
    expect(safeNextPath(null)).toBe("/")
  })
})
