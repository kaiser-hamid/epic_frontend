import { ErrorCode, errorMessage, isApiError } from "@/lib/api-error"

/** Donor serology error codes (`modules/BloodBank/Exceptions` `errorCode()` values). */
export const SerologyErrorCode = {
  CaseNotFound: "CASE_NOT_FOUND",
  DonorSampleNotFound: "DONOR_SAMPLE_NOT_FOUND",
  CaseNotOpen: "CASE_NOT_OPEN",
  CaseDonorNotInCase: "CASE_DONOR_NOT_IN_CASE",
  DonorNotFit: "DONOR_NOT_FIT",
  DonorDeferred: "DONOR_DEFERRED",
  DonorSampleNotCollected: "DONOR_SAMPLE_NOT_COLLECTED",
  SerologyLocked: "SEROLOGY_LOCKED",
  AmendmentReasonRequired: "AMENDMENT_REASON_REQUIRED",
  ReactiveDonorNotAcceptable: "REACTIVE_DONOR_NOT_ACCEPTABLE",
} as const

/** Codes meaning the screen is out of date: toast, then reload it. */
export const serologyReloadCodes: readonly string[] = [
  SerologyErrorCode.DonorNotFit,
  SerologyErrorCode.DonorDeferred,
  SerologyErrorCode.DonorSampleNotCollected,
  SerologyErrorCode.SerologyLocked,
  SerologyErrorCode.CaseNotOpen,
  SerologyErrorCode.CaseDonorNotInCase,
  // The form only records a new serology; this means someone saved one meanwhile.
  SerologyErrorCode.AmendmentReasonRequired,
]

export const REACTIVE_DONOR_TEXT = "A reactive donor cannot be accepted."

/** Text for donor serology error codes. */
export const serologyErrorMessages: Partial<Record<string, string>> = {
  [SerologyErrorCode.CaseNotFound]: "No case found for this invoice.",
  [SerologyErrorCode.DonorSampleNotFound]: "Not a donor sample of this branch.",
  [SerologyErrorCode.CaseNotOpen]:
    "This case is closed or cancelled. The screen has been refreshed.",
  [SerologyErrorCode.CaseDonorNotInCase]:
    "This donor is not registered for this case. The screen has been refreshed.",
  [SerologyErrorCode.DonorNotFit]:
    "This donor has not been accepted at the physical examination. The screen has been refreshed.",
  [SerologyErrorCode.DonorDeferred]:
    "This donor was deferred at the physical examination. The screen has been refreshed.",
  [SerologyErrorCode.DonorSampleNotCollected]:
    "The donor sample has not been collected yet. The screen has been refreshed.",
  [SerologyErrorCode.SerologyLocked]:
    "The blood bag has been collected; the serology can't be changed. The screen has been refreshed.",
  [SerologyErrorCode.AmendmentReasonRequired]:
    "This donor's serology was already saved. The screen has been refreshed.",
  [SerologyErrorCode.ReactiveDonorNotAcceptable]: REACTIVE_DONOR_TEXT,
  [ErrorCode.Forbidden]: "You don't have access to this case.",
  [ErrorCode.NotFound]: "This case was not found.",
  INVALID_QUERY: "This list filter is not supported.",
}

/**
 * Text for a serology error. A validation error without a field to sit under (a scan
 * lookup) shows the server's first field message instead of the generic one.
 */
export function serologyErrorText(error: unknown): string {
  if (isApiError(error) && error.isValidation) {
    const first = Object.values(error.errors)[0]?.[0]
    if (first) {
      return first
    }
  }
  return errorMessage(error, serologyErrorMessages)
}
