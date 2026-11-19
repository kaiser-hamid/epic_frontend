import { ErrorCode, errorMessage, isApiError } from "@/lib/api-error"

/** Unit error codes (`modules/BloodBank/Exceptions` `errorCode()` values). */
export const UnitErrorCode = {
  UnitNotInCase: "UNIT_NOT_IN_CASE",
} as const

/** Text for unit error codes. */
export const unitErrorMessages: Partial<Record<string, string>> = {
  [UnitErrorCode.UnitNotInCase]: "Unit is not on this case",
  [ErrorCode.ReprintReasonRequired]: "Enter a reason to reprint the label.",
  [ErrorCode.Forbidden]: "Not allowed",
  INVALID_QUERY: "This list filter is not supported.",
}

/**
 * Text for a unit error. A validation error without a field to sit under (a label print) shows
 * the server's first field message instead of the generic one.
 */
export function unitErrorText(error: unknown): string {
  if (isApiError(error) && error.isValidation) {
    const first = Object.values(error.errors)[0]?.[0]
    if (first) {
      return first
    }
  }
  return errorMessage(error, unitErrorMessages)
}
