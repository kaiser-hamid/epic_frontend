import type { UseFormSetError } from "react-hook-form"
import { z } from "zod"

import { isApiError } from "@/lib/api-error"
import {
  parseBloodPressure,
  parseDecimal,
} from "@/modules/blood-bank/donor-examinations/format"
import type {
  ExaminationDonor,
  PhysicalExaminationInput,
} from "@/modules/blood-bank/donor-examinations/types"
import { ExaminationDecision } from "@/modules/blood-bank/enums"

/**
 * One donor's physical examination form. Numbers are typed as text so decimals ("68.5",
 * "120/80") can be checked as typed; `toExaminationPayload` turns them into the API's JSON
 * numbers. Ranges mirror the backend and only catch typos. "Accept donor" is the physician's
 * switch: on is `accepted`, off is `deferred` and needs a reason.
 */

const HEIGHT_CM = { min: 50, max: 250 }
const BP = { systolic: [50, 300], diastolic: [20, 200] } as const
const REASON_MAX = 1000

function measurement(
  label: string,
  { min, max, decimals }: { min: number; max: number; decimals: number }
) {
  return z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      if (value === "") {
        ctx.addIssue({ code: "custom", message: `Enter the ${label}.` })
        return
      }
      const number = parseDecimal(value, decimals)
      if (number === null) {
        ctx.addIssue({
          code: "custom",
          message:
            decimals === 0
              ? "Enter a whole number."
              : `Enter a number with at most ${decimals} decimal${decimals > 1 ? "s" : ""}.`,
        })
      } else if (number < min || number > max) {
        ctx.addIssue({
          code: "custom",
          message: `Must be between ${min} and ${max}.`,
        })
      }
    })
}

const examinationFields = z.object({
  weight_kg: measurement("weight", { min: 20, max: 250, decimals: 2 }),
  height_cm: z.string().trim(),
  hemoglobin_g_dl: measurement("hemoglobin", { min: 1, max: 25, decimals: 1 }),
  pulse_bpm: measurement("pulse", { min: 20, max: 250, decimals: 0 }),
  blood_pressure: z.string().trim(),
  temperature_f: measurement("temperature", { min: 90, max: 110, decimals: 1 }),
  accept: z.boolean(),
  deferral_reason: z.string().trim(),
})

/** Field names the server's error keys can land on. */
const fieldNames = examinationFields.keyof().options

export const examinationSchema = examinationFields.superRefine(
  (values, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message })

    if (values.height_cm !== "") {
      const cm = parseDecimal(values.height_cm, 1)
      if (cm === null) {
        issue("height_cm", "Enter a number with at most 1 decimal.")
      } else if (cm < HEIGHT_CM.min || cm > HEIGHT_CM.max) {
        issue(
          "height_cm",
          `Must be between ${HEIGHT_CM.min} and ${HEIGHT_CM.max}.`
        )
      }
    }

    if (values.blood_pressure === "") {
      issue("blood_pressure", "Enter the blood pressure, e.g. 120/80.")
    } else {
      const bp = parseBloodPressure(values.blood_pressure)
      if (bp === null) {
        issue("blood_pressure", "Enter it as systolic/diastolic, e.g. 120/80.")
      } else if (bp.systolic < BP.systolic[0] || bp.systolic > BP.systolic[1]) {
        issue(
          "blood_pressure",
          `Systolic must be between ${BP.systolic[0]} and ${BP.systolic[1]}.`
        )
      } else if (
        bp.diastolic < BP.diastolic[0] ||
        bp.diastolic > BP.diastolic[1]
      ) {
        issue(
          "blood_pressure",
          `Diastolic must be between ${BP.diastolic[0]} and ${BP.diastolic[1]}.`
        )
      } else if (bp.diastolic >= bp.systolic) {
        issue("blood_pressure", "Diastolic must be below systolic.")
      }
    }

    if (!values.accept && values.deferral_reason === "") {
      issue("deferral_reason", "Enter the reason for deferral.")
    }
    if (values.deferral_reason.length > REASON_MAX) {
      issue("deferral_reason", `At most ${REASON_MAX} characters.`)
    }
  }
)

export type ExaminationFormValues = z.infer<typeof examinationSchema>

/** The cleared form. "Accept donor" starts off, so a donor is never accepted by accident. */
export const emptyExaminationValues: ExaminationFormValues = {
  weight_kg: "",
  height_cm: "",
  hemoglobin_g_dl: "",
  pulse_bpm: "",
  blood_pressure: "",
  temperature_f: "",
  accept: false,
  deferral_reason: "",
}

function text(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value)
}

/** Form values for a donor: the saved examination, or an empty form. */
export function examinationDefaults(
  donor: ExaminationDonor
): ExaminationFormValues {
  const { examination } = donor
  if (!examination) {
    return emptyExaminationValues
  }

  return {
    weight_kg: text(examination.weight_kg),
    height_cm: text(examination.height_cm),
    hemoglobin_g_dl: text(examination.hemoglobin_g_dl),
    pulse_bpm: text(examination.pulse_bpm),
    blood_pressure: `${examination.bp_systolic}/${examination.bp_diastolic}`,
    temperature_f: text(examination.temperature_f),
    accept: donor.decision === ExaminationDecision.Accepted,
    deferral_reason: donor.deferral_reason ?? "",
  }
}

/**
 * The request body for validated values; null if a value cannot be read (the schema
 * prevents that). No time is sent: the server stamps the examination. `deferral_reason` is
 * sent only with a deferral.
 */
export function toExaminationPayload(
  values: ExaminationFormValues
): PhysicalExaminationInput | null {
  const weight = parseDecimal(values.weight_kg, 2)
  const hemoglobin = parseDecimal(values.hemoglobin_g_dl, 1)
  const pulse = parseDecimal(values.pulse_bpm, 0)
  const temperature = parseDecimal(values.temperature_f, 1)
  const bp = parseBloodPressure(values.blood_pressure)

  if (
    weight === null ||
    hemoglobin === null ||
    pulse === null ||
    temperature === null ||
    bp === null
  ) {
    return null
  }

  return {
    weight_kg: weight,
    height_cm:
      values.height_cm === "" ? null : parseDecimal(values.height_cm, 1),
    hemoglobin_g_dl: hemoglobin,
    pulse_bpm: pulse,
    bp_systolic: bp.systolic,
    bp_diastolic: bp.diastolic,
    temperature_f: temperature,
    ...(values.accept
      ? { decision: ExaminationDecision.Accepted }
      : {
          decision: ExaminationDecision.Deferred,
          deferral_reason: values.deferral_reason,
        }),
  }
}

/**
 * Puts `VALIDATION_FAILED` errors on the form. `bp_systolic` and `bp_diastolic` land on the
 * single BP input, `decision` on the switch. Returns true when at least one error was
 * placed, so the caller can skip the toast.
 */
export function applyExaminationErrors(
  error: unknown,
  setError: UseFormSetError<ExaminationFormValues>
): boolean {
  if (!isApiError(error) || !error.isValidation) {
    return false
  }

  const targets = new Map<keyof ExaminationFormValues, string>()
  for (const [key, messages] of Object.entries(error.errors)) {
    const message = messages[0]
    const target =
      key === "bp_systolic" || key === "bp_diastolic"
        ? "blood_pressure"
        : key === "decision"
          ? "accept"
          : fieldNames.find((name) => name === key)
    if (message && target && !targets.has(target)) {
      targets.set(target, message)
    }
  }

  let first = true
  for (const [name, message] of targets) {
    setError(name, { type: "server", message }, { shouldFocus: first })
    first = false
  }
  return targets.size > 0
}
