import type { UseFormSetError } from "react-hook-form"
import { z } from "zod"

import { isApiError } from "@/lib/api-error"
import { REACTIVE_DONOR_TEXT } from "@/modules/blood-bank/donor-serology/error-messages"
import {
  screeningTests,
  type DonorSerologyInput,
  type SerologyDonor,
} from "@/modules/blood-bank/donor-serology/types"
import { ScreeningResult, SerologyDecision } from "@/modules/blood-bank/enums"
import { BloodGroup } from "@/modules/shared/patient/enums"

/**
 * One donor's serology form. Choices start empty ("") so nothing is recorded by accident;
 * the schema requires each one. A reactive screening result allows only Defer. A saved
 * serology is shown read-only, so the form never amends one.
 */

const REASON_MAX = 1000

const choice = <T extends Record<string, string>>(values: T, message: string) =>
  z
    .enum(values)
    .or(z.literal(""))
    .refine((value) => value !== "", { message })

const serologyFields = z.object({
  blood_group: choice(BloodGroup, "Select the blood group."),
  hbsag: choice(ScreeningResult, "Select the HBsAg result."),
  anti_hcv: choice(ScreeningResult, "Select the HCV result."),
  anti_hiv: choice(ScreeningResult, "Select the HIV result."),
  syphilis: choice(ScreeningResult, "Select the syphilis result."),
  decision: choice(SerologyDecision, "Accept or defer the donor."),
  deferral_reason: z.string().trim(),
})

export const serologySchema = serologyFields.superRefine((values, ctx) => {
  const issue = (path: keyof typeof values, message: string) =>
    ctx.addIssue({ code: "custom", path: [path], message })

  if (
    values.decision === SerologyDecision.Accepted &&
    hasReactiveResult(values)
  ) {
    issue("decision", REACTIVE_DONOR_TEXT)
  }

  if (values.decision === SerologyDecision.Deferred) {
    if (values.deferral_reason === "") {
      issue("deferral_reason", "Enter the reason for deferral.")
    } else if (values.deferral_reason.length > REASON_MAX) {
      issue("deferral_reason", `At most ${REASON_MAX} characters.`)
    }
  }
})

export type SerologyFormValues = z.input<typeof serologyFields>

/** Field names the server's error keys can land on. */
const fieldNames = serologyFields.keyof().options

export function hasReactiveResult(
  values: Pick<SerologyFormValues, (typeof screeningTests)[number]>
): boolean {
  return screeningTests.some(
    (test) => values[test] === ScreeningResult.Reactive
  )
}

/** The empty form. */
export const emptySerologyValues: SerologyFormValues = {
  blood_group: "",
  hbsag: "",
  anti_hcv: "",
  anti_hiv: "",
  syphilis: "",
  decision: "",
  deferral_reason: "",
}

/**
 * Form values for a donor: the saved serology and decision, or an empty form. The saved
 * deferral reason is prefilled only for a serology deferral.
 */
export function serologyDefaults(donor: SerologyDonor): SerologyFormValues {
  const { serology } = donor
  if (!serology) {
    return emptySerologyValues
  }

  return {
    blood_group: serology.blood_group,
    hbsag: serology.hbsag,
    anti_hcv: serology.anti_hcv,
    anti_hiv: serology.anti_hiv,
    syphilis: serology.syphilis,
    decision: donor.decision ?? "",
    deferral_reason:
      donor.decision === SerologyDecision.Deferred
        ? (donor.deferral_reason ?? "")
        : "",
  }
}

/**
 * The request body for validated values; null if a choice is still empty (the schema
 * prevents that). `deferral_reason` is sent only with a deferral.
 */
export function toSerologyPayload(
  values: SerologyFormValues
): DonorSerologyInput | null {
  const { blood_group, hbsag, anti_hcv, anti_hiv, syphilis, decision } = values
  if (
    blood_group === "" ||
    hbsag === "" ||
    anti_hcv === "" ||
    anti_hiv === "" ||
    syphilis === "" ||
    decision === ""
  ) {
    return null
  }

  return {
    blood_group,
    hbsag,
    anti_hcv,
    anti_hiv,
    syphilis,
    decision,
    ...(decision === SerologyDecision.Deferred
      ? { deferral_reason: values.deferral_reason.trim() }
      : {}),
  }
}

/**
 * Puts `VALIDATION_FAILED` errors on the form. Returns true when at least one error was
 * placed, so the caller can skip the toast.
 */
export function applySerologyErrors(
  error: unknown,
  setError: UseFormSetError<SerologyFormValues>
): boolean {
  if (!isApiError(error) || !error.isValidation) {
    return false
  }

  let placed = 0
  for (const [key, messages] of Object.entries(error.errors)) {
    const message = messages[0]
    const target = fieldNames.find((name) => name === key)
    if (message && target) {
      setError(
        target,
        { type: "server", message },
        { shouldFocus: placed === 0 }
      )
      placed += 1
    }
  }
  return placed > 0
}
