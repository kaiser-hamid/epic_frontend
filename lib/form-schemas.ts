import { z } from "zod"

/** Zod building blocks shared by the registration forms (bill entry, Add donor, case details). */

export const text = (max: number) =>
  z.string().trim().max(max, `At most ${max} characters.`)

/** Optional select: "" means not chosen. */
export const optionalEnum = <T extends Record<string, string>>(values: T) =>
  z.union([z.enum(values), z.literal("")])

/** "" or `YYYY-MM-DD` (native date input). "Not in the future" is checked by the backend. */
export const plainDate = z
  .string()
  .regex(/^$|^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.")

/** Digits only (the input drops anything else); "" when not given. */
export const phone = z
  .string()
  .regex(/^\d*$/, "Enter digits only.")
  .max(20, "At most 20 digits.")

export const wholeNumber = (min: number, max: number) =>
  z
    .number({ error: "Enter a number." })
    .int("Enter a whole number.")
    .min(min, `At least ${min}.`)
    .max(max, `At most ${max}.`)

export const id = (message: string) =>
  z.number({ error: message }).int(message).positive(message)

/** Adds an issue on every repeated value after its first row, so the duplicate row is highlighted. */
export function flagDuplicates(
  ctx: z.RefinementCtx,
  rows: readonly Record<string, unknown>[],
  arrayPath: (string | number)[],
  key: string,
  message: string
) {
  const seen = new Set<unknown>()
  rows.forEach((row, index) => {
    const value = row[key]
    if (value === undefined) {
      return
    }
    if (seen.has(value)) {
      ctx.addIssue({
        code: "custom",
        path: [...arrayPath, index, key],
        message,
      })
    }
    seen.add(value)
  })
}
