import { z } from "zod"

import { CareType } from "@/modules/blood-bank/enums"

const caseDetailsShape = {
  care_type: z.enum(CareType, { error: "Select care type." }),
  transfusion_reason: z.string().trim().max(500),
  reference_note: z.string().trim().max(1000),
}

export const caseComponentSchema = z.object({
  component_type_id: z
    .number({ error: "Select a component." })
    .int()
    .positive(),
  quantity: z
    .number({ error: "Enter a quantity." })
    .int()
    .min(1, "At least 1.")
    .max(20, "At most 20."),
})

export const caseCreateSchema = z
  .object({
    patient_master_id: z
      .number({ error: "Select a patient." })
      .int()
      .positive(),
    ...caseDetailsShape,
    components: z
      .array(caseComponentSchema)
      .min(1, "Add at least one component."),
  })
  .superRefine((values, ctx) => {
    // Backend: unique per (case, component type). Checked here to point at the row.
    const seen = new Set<number>()
    values.components.forEach((line, index) => {
      if (seen.has(line.component_type_id)) {
        ctx.addIssue({
          code: "custom",
          path: ["components", index, "component_type_id"],
          message: "This component is already listed.",
        })
      }
      seen.add(line.component_type_id)
    })
  })

export type CaseCreateValues = z.infer<typeof caseCreateSchema>

export const caseUpdateSchema = z.object(caseDetailsShape)

export type CaseUpdateValues = z.infer<typeof caseUpdateSchema>
