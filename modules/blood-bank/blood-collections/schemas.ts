import { z } from "zod"

import { localDateTimeToIso } from "@/lib/format"
import type {
  BagPlanRow,
  CollectBloodInput,
} from "@/modules/blood-bank/blood-collections/types"
import type { StorageLocation } from "@/modules/blood-bank/storage-locations/types"

/**
 * The "Collect" popup: the bag (notes, when) and one row per unit of the bag plan.
 * Ranges mirror the backend (`CollectBloodData`, `CollectedUnitData`). `collected_at` is a
 * `datetime-local` value read as Asia/Dhaka time; empty leaves it to the server (now). It may
 * be back-dated, never future-dated. A row that needs a storage location (stock, or a patient
 * unit kept in storage) must have one; a unit's ml is optional (the bag records no volume).
 */

export const UNIT_VOLUME_ML = { min: 1, max: 600 } as const
const NOTES_MAX = 500

const unitRowSchema = z
  .object({
    component_type_id: z.number(),
    code: z.string(),
    name: z.string(),
    for_patient: z.boolean(),
    needs_storage_location: z.boolean(),
    storage_location_id: z.number().optional(),
    volume_ml: z
      .number()
      .int("Enter a whole number.")
      .min(UNIT_VOLUME_ML.min, `At least ${UNIT_VOLUME_ML.min} ml.`)
      .max(UNIT_VOLUME_ML.max, `At most ${UNIT_VOLUME_ML.max} ml.`)
      .optional(),
  })
  .superRefine((row, ctx) => {
    if (row.needs_storage_location && row.storage_location_id === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["storage_location_id"],
        message: "Choose where it is stored.",
      })
    }
  })

export const collectBloodSchema = z.object({
  notes: z.string().trim().max(NOTES_MAX, `At most ${NOTES_MAX} characters.`),
  collected_at: z.string().superRefine((value, ctx) => {
    if (value === "") {
      return
    }
    const iso = localDateTimeToIso(value)
    if (iso === null) {
      ctx.addIssue({ code: "custom", message: "Enter a date and time." })
    } else if (Date.parse(iso) > Date.now()) {
      ctx.addIssue({ code: "custom", message: "Can't be in the future." })
    }
  }),
  units: z.array(unitRowSchema),
})

export type CollectBloodValues = z.input<typeof collectBloodSchema>
export type CollectedUnitRowValues = CollectBloodValues["units"][number]

/**
 * The form for a bag plan: a row per planned unit, its shelf pre-filled with the first active
 * location of the component's usual type (rows that need none start empty).
 */
export function defaultCollectBloodValues(
  plan: BagPlanRow[],
  locations: StorageLocation[]
): CollectBloodValues {
  return {
    notes: "",
    collected_at: "",
    units: plan.map((row) => ({
      component_type_id: row.component_type_id,
      code: row.code,
      name: row.name,
      for_patient: row.for_patient,
      needs_storage_location: row.needs_storage_location,
      storage_location_id: row.needs_storage_location
        ? locations.find(
            (location) => location.type === row.default_location_type
          )?.id
        : undefined,
      volume_ml: undefined,
    })),
  }
}

export function toCollectBloodPayload(
  values: CollectBloodValues
): CollectBloodInput {
  return {
    notes: values.notes.trim() || null,
    collected_at:
      values.collected_at === ""
        ? null
        : localDateTimeToIso(values.collected_at),
    units: values.units.map((row) => ({
      component_type_id: row.component_type_id,
      storage_location_id: row.storage_location_id ?? null,
      volume_ml: row.volume_ml ?? null,
    })),
  }
}
