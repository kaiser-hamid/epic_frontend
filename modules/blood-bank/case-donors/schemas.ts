import type { UseFormSetError } from "react-hook-form"
import { z } from "zod"

import { isApiError } from "@/lib/api-error"
import {
  caseDonorSchema,
  checkNewDonor,
  emptyCaseDonor,
} from "@/modules/blood-bank/cases/schemas"

/**
 * The Add donor form: the invoice no of a bill already saved for the case's patient, and one
 * donor. The donor sits at `donors.0` so the donor entry (phone lookup, new-donor fields) is
 * reused as is; `api.ts` sends it as `donor_id` or `donor`, and `applyAddDonorErrors` moves the
 * server's `donor_id` / `donor.*` errors onto `donors.0.*`.
 */

export const ALREADY_ON_CASE_TEXT = "Already on this case"

export function addDonorSchema(existingDonorIds: ReadonlySet<number>) {
  return z
    .object({
      invoice_no: z
        .string()
        .trim()
        .min(1, "Enter the invoice no.")
        .max(30, "At most 30 characters.")
        .regex(/^[A-Za-z0-9]*$/, "Letters and digits only."),
      donors: z.tuple([caseDonorSchema]),
    })
    .superRefine((values, ctx) => {
      const [entry] = values.donors
      checkNewDonor(ctx, entry, ["donors", 0])
      if (
        entry.donor_id !== undefined &&
        existingDonorIds.has(entry.donor_id)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["donors", 0, "donor_id"],
          message: "This donor is already on the case.",
        })
      }
    })
}

export type AddDonorValues = z.infer<ReturnType<typeof addDonorSchema>>

export const emptyAddDonorValues: AddDonorValues = {
  invoice_no: "",
  donors: [emptyCaseDonor],
}

/** A server error key → its form path (`donor.name` → `donors.0.donor.name`). */
export function addDonorErrorPath(key: string): string {
  return key === "donor_id" || key === "donor" || key.startsWith("donor.")
    ? `donors.0.${key}`
    : key
}

/**
 * Puts `VALIDATION_FAILED` errors on the form. Returns true when the error was handled, so
 * the caller can skip the toast.
 */
export function applyAddDonorErrors(
  error: unknown,
  setError: UseFormSetError<AddDonorValues>
): boolean {
  if (!isApiError(error) || !error.isValidation) {
    return false
  }

  let first = true
  for (const [key, messages] of Object.entries(error.errors)) {
    setError(
      // Server keys follow the body; `addDonorErrorPath` maps them onto the form's paths.
      addDonorErrorPath(key) as Parameters<typeof setError>[0],
      { type: "server", message: messages[0] },
      { shouldFocus: first }
    )
    first = false
  }
  return true
}
