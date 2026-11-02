import { z } from "zod"

import { localDateTimeToIso } from "@/lib/format"
import type { CollectBloodInput } from "@/modules/blood-bank/blood-collections/types"

/**
 * The "Collect" dialog. Ranges mirror the backend (`CollectBloodData`). `collected_at` is a
 * `datetime-local` value read as Asia/Dhaka time; empty leaves it to the server (now). It may
 * be back-dated, never future-dated.
 */

export const VOLUME_ML = { min: 50, max: 600, default: 450 } as const
const NOTES_MAX = 500

export const collectBloodSchema = z.object({
  volume_ml: z
    .number({ error: "Enter the volume." })
    .int("Enter a whole number.")
    .min(VOLUME_ML.min, `At least ${VOLUME_ML.min} ml.`)
    .max(VOLUME_ML.max, `At most ${VOLUME_ML.max} ml.`),
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
})

export type CollectBloodValues = z.infer<typeof collectBloodSchema>

export const defaultCollectBloodValues: CollectBloodValues = {
  volume_ml: VOLUME_ML.default,
  notes: "",
  collected_at: "",
}

export function toCollectBloodPayload(
  values: CollectBloodValues
): CollectBloodInput {
  return {
    volume_ml: values.volume_ml,
    notes: values.notes.trim() || null,
    collected_at:
      values.collected_at === ""
        ? null
        : localDateTimeToIso(values.collected_at),
  }
}
