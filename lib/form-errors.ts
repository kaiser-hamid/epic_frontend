import type { FieldPath, FieldValues, UseFormSetError } from "react-hook-form"

import { isApiError } from "@/lib/api-error"

/**
 * Puts `VALIDATION_FAILED` errors onto form fields. Laravel keys (`components.0.quantity`)
 * match react-hook-form paths because both use snake_case dot notation.
 * Returns true when the error was handled, so the caller can skip the toast.
 */
export function applyServerErrors<TValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TValues>
): boolean {
  if (!isApiError(error) || !error.isValidation) {
    return false
  }

  let first = true
  for (const [field, messages] of Object.entries(error.errors)) {
    setError(
      field as FieldPath<TValues>,
      { type: "server", message: messages[0] },
      { shouldFocus: first }
    )
    first = false
  }

  return true
}
