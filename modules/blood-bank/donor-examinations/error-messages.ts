import { ErrorCode, errorMessage, isApiError } from "@/lib/api-error"

/** Donor examination error codes (`modules/BloodBank/Exceptions` `errorCode()` values). */
export const ExaminationErrorCode = {
  CaseNotFound: "CASE_NOT_FOUND",
  CaseNotOpen: "CASE_NOT_OPEN",
  CaseDonorNotInCase: "CASE_DONOR_NOT_IN_CASE",
  ExaminationLocked: "EXAMINATION_LOCKED",
} as const

/** Text for donor examination error codes. */
export const examinationErrorMessages: Partial<Record<string, string>> = {
  [ExaminationErrorCode.CaseNotFound]:
    "No case found for this invoice in this branch.",
  [ExaminationErrorCode.CaseNotOpen]:
    "This case is closed or cancelled. The screen has been refreshed.",
  [ExaminationErrorCode.CaseDonorNotInCase]:
    "This donor is not registered for this case. The screen has been refreshed.",
  [ExaminationErrorCode.ExaminationLocked]:
    "Sample already collected; the examination can't be changed. The screen has been refreshed.",
  [ErrorCode.Forbidden]:
    "You do not have permission to do this in this branch.",
  [ErrorCode.NotFound]: "This case was not found.",
  INVALID_QUERY: "This list filter is not supported.",
}

/**
 * Text for an examination error. A validation error without a field to sit under (an invoice
 * lookup) shows the server's first field message instead of the generic one.
 */
export function examinationErrorText(error: unknown): string {
  if (isApiError(error) && error.isValidation) {
    const first = Object.values(error.errors)[0]?.[0]
    if (first) {
      return first
    }
  }
  return errorMessage(error, examinationErrorMessages)
}
