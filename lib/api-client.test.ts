import { describe, expect, it } from "vitest"

import { serializeParams } from "@/lib/api-client"

describe("serializeParams", () => {
  it("builds Spatie query-builder params and drops empty filters", () => {
    const query = serializeParams({
      filter: { status: "open", search: "", branch: null },
      sort: "-created_at",
      include: ["patient", "components.component_type"],
      page: 2,
    })

    expect(decodeURIComponent(query)).toBe(
      "filter[status]=open&sort=-created_at&include=patient,components.component_type&page=2"
    )
  })

  it("repeats `name[]` keys per value and omits them when empty", () => {
    expect(
      decodeURIComponent(
        serializeParams({ search: "cbc", "exclude_ids[]": [4, 9] })
      )
    ).toBe("search=cbc&exclude_ids[]=4&exclude_ids[]=9")
    expect(serializeParams({ search: "cbc", "exclude_ids[]": [] })).toBe(
      "search=cbc"
    )
  })
})
