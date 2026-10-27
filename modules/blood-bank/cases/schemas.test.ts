import { describe, expect, it } from "vitest"

import { caseCreateSchema } from "@/modules/blood-bank/cases/schemas"

const valid = {
  patient_master_id: 1,
  care_type: "daycare",
  transfusion_reason: "",
  reference_note: "",
  components: [{ component_type_id: 2, quantity: 2 }],
}

describe("caseCreateSchema", () => {
  it("requires at least one component", () => {
    const result = caseCreateSchema.safeParse({ ...valid, components: [] })
    expect(result.success).toBe(false)
  })

  it("flags the duplicated component row, not the first one", () => {
    const result = caseCreateSchema.safeParse({
      ...valid,
      components: [
        { component_type_id: 2, quantity: 2 },
        { component_type_id: 2, quantity: 1 },
      ],
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([
      ["components", 1, "component_type_id"],
    ])
  })
})
