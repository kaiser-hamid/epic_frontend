import { z } from "zod"

import { localDateTimeToIso } from "@/lib/format"
import type {
  PhlebotomyVitals,
  RecordPhlebotomyInput,
} from "@/modules/blood-bank/blood-collections/types"
import { VITALS } from "@/modules/blood-bank/blood-issue/schemas"
import { parseDecimal } from "@/modules/blood-bank/donor-examinations/format"

/**
 * The Therapeutic Phlebotomy "Mark done" form. Ranges mirror the backend
 * (`RecordTherapeuticPhlebotomyData`, `VitalsData`) and only catch typos. Pre and post
 * vitals are optional; once one field of a set is filled, all four are needed.
 */

export const PHLEBOTOMY_VOLUME_ML = {
  min: 50,
  max: 1000,
  default: 450,
} as const
const NOTES_MAX = 500

const VITALS_LABELS = {
  pulse_bpm: "pulse",
  bp_systolic: "systolic pressure",
  bp_diastolic: "diastolic pressure",
  temperature_f: "temperature",
} as const

function wholeNumber({ min, max }: { min: number; max: number }) {
  return z
    .number()
    .optional()
    .superRefine((value, ctx) => {
      if (value === undefined) {
        return
      }
      if (!Number.isInteger(value)) {
        ctx.addIssue({ code: "custom", message: "Enter a whole number." })
      } else if (value < min || value > max) {
        ctx.addIssue({
          code: "custom",
          message: `Must be between ${min} and ${max}.`,
        })
      }
    })
}

const vitalsSchema = z
  .object({
    pulse_bpm: wholeNumber(VITALS.pulse_bpm),
    bp_systolic: wholeNumber(VITALS.bp_systolic),
    bp_diastolic: wholeNumber(VITALS.bp_diastolic),
    // Typed as text so one decimal ("98.4") can be checked as typed.
    temperature_f: z
      .string()
      .trim()
      .superRefine((value, ctx) => {
        if (value === "") {
          return
        }
        const { min, max } = VITALS.temperature_f
        const number = parseDecimal(value, 1)
        if (number === null) {
          ctx.addIssue({
            code: "custom",
            message: "Enter a number with at most 1 decimal.",
          })
        } else if (number < min || number > max) {
          ctx.addIssue({
            code: "custom",
            message: `Must be between ${min} and ${max}.`,
          })
        }
      }),
  })
  .superRefine((set, ctx) => {
    if (!isEmptyVitals(set)) {
      for (const name of Object.keys(
        VITALS_LABELS
      ) as (keyof typeof VITALS_LABELS)[]) {
        const value = set[name]
        if (value === undefined || value === "") {
          ctx.addIssue({
            code: "custom",
            path: [name],
            message: `Enter the ${VITALS_LABELS[name]}, or clear these vitals.`,
          })
        }
      }
    }
    if (
      set.bp_systolic !== undefined &&
      set.bp_diastolic !== undefined &&
      set.bp_diastolic >= set.bp_systolic
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["bp_diastolic"],
        message: "Diastolic must be below systolic.",
      })
    }
  })

export const recordPhlebotomySchema = z.object({
  volume_ml: z
    .number({ error: "Enter the volume." })
    .int("Enter a whole number.")
    .min(PHLEBOTOMY_VOLUME_ML.min, `At least ${PHLEBOTOMY_VOLUME_ML.min} ml.`)
    .max(PHLEBOTOMY_VOLUME_ML.max, `At most ${PHLEBOTOMY_VOLUME_ML.max} ml.`),
  pre: vitalsSchema,
  post: vitalsSchema,
  notes: z.string().trim().max(NOTES_MAX, `At most ${NOTES_MAX} characters.`),
  performed_at: z.string().superRefine((value, ctx) => {
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

export type RecordPhlebotomyValues = z.input<typeof recordPhlebotomySchema>
export type PhlebotomyVitalsValues = RecordPhlebotomyValues["pre"]

function isEmptyVitals(set: PhlebotomyVitalsValues): boolean {
  return (
    set.pulse_bpm === undefined &&
    set.bp_systolic === undefined &&
    set.bp_diastolic === undefined &&
    set.temperature_f.trim() === ""
  )
}

const emptyVitals: PhlebotomyVitalsValues = {
  pulse_bpm: undefined,
  bp_systolic: undefined,
  bp_diastolic: undefined,
  temperature_f: "",
}

export const defaultRecordPhlebotomyValues: RecordPhlebotomyValues = {
  volume_ml: PHLEBOTOMY_VOLUME_ML.default,
  pre: emptyVitals,
  post: emptyVitals,
  notes: "",
  performed_at: "",
}

/** A complete set, or null when left empty (validation has run, so it is all or nothing). */
function toVitals(set: PhlebotomyVitalsValues): PhlebotomyVitals | null {
  const temperature = parseDecimal(set.temperature_f, 1)
  if (
    set.pulse_bpm === undefined ||
    set.bp_systolic === undefined ||
    set.bp_diastolic === undefined ||
    temperature === null
  ) {
    return null
  }
  return {
    pulse_bpm: set.pulse_bpm,
    bp_systolic: set.bp_systolic,
    bp_diastolic: set.bp_diastolic,
    temperature_f: temperature,
  }
}

export function toRecordPhlebotomyPayload(
  values: RecordPhlebotomyValues
): RecordPhlebotomyInput {
  return {
    volume_ml: values.volume_ml,
    pre: toVitals(values.pre),
    post: toVitals(values.post),
    notes: values.notes.trim() || null,
    performed_at:
      values.performed_at === ""
        ? null
        : localDateTimeToIso(values.performed_at),
  }
}
