import { ErrorCode, errorMessage, isApiError } from "@/lib/api-error"

/** Sample collection error codes (`modules/BloodBank/Exceptions` `errorCode()` values). */
export const SampleErrorCode = {
  CaseNotFound: "CASE_NOT_FOUND",
  SampleAlreadyCollected: "SAMPLE_ALREADY_COLLECTED",
  DonorDeferred: "DONOR_DEFERRED",
  CaseDonorNotInCase: "CASE_DONOR_NOT_IN_CASE",
  CaseNotOpen: "CASE_NOT_OPEN",
  SampleNotInCase: "SAMPLE_NOT_IN_CASE",
  UnitNotFound: "UNIT_NOT_FOUND",
  UnitNotAvailable: "UNIT_NOT_AVAILABLE",
  UnitAlreadyInCase: "UNIT_ALREADY_IN_CASE",
  UnitExpired: "UNIT_EXPIRED",
  UnitNotNeeded: "UNIT_NOT_NEEDED",
  CaseTakesNoBlood: "CASE_TAKES_NO_BLOOD",
} as const

/** Text for sample collection error codes. */
export const sampleErrorMessages: Partial<Record<string, string>> = {
  [SampleErrorCode.CaseNotFound]:
    "No Blood Bank case found for this invoice in this branch.",
  [SampleErrorCode.SampleAlreadyCollected]:
    "A sample was already collected for one of the ticked rows. The screen has been refreshed.",
  [SampleErrorCode.DonorDeferred]:
    "A ticked donor has been deferred. The screen has been refreshed; register a replacement donor instead.",
  [SampleErrorCode.CaseDonorNotInCase]:
    "A ticked donor is not registered for this case.",
  [SampleErrorCode.CaseNotOpen]:
    "This case is closed or cancelled, so samples cannot be collected.",
  [SampleErrorCode.SampleNotInCase]:
    "A label belongs to a sample of another case.",
  [SampleErrorCode.UnitNotFound]:
    "No blood unit of this branch has this unit no.",
  [SampleErrorCode.UnitNotAvailable]:
    "This bag is not in stock: it is held, reserved or issued for another case, or quarantined.",
  [SampleErrorCode.UnitAlreadyInCase]:
    "This bag has already been taken for this case.",
  [SampleErrorCode.UnitExpired]: "This bag has expired.",
  [SampleErrorCode.UnitNotNeeded]:
    "The case needs no more units of this component.",
  [SampleErrorCode.CaseTakesNoBlood]:
    "This case is billed for a procedure and is not given blood.",
  [ErrorCode.NotFound]: "This case was not found.",
  [ErrorCode.ReprintReasonRequired]: "Enter a reason to reprint the label.",
  INVALID_QUERY: "This list filter is not supported.",
}

/**
 * Toast text for a sample action. Body validation errors here have no form field to sit
 * under, so the server's first field message is shown instead of the generic one.
 */
export function sampleErrorText(error: unknown): string {
  if (isApiError(error) && error.isValidation) {
    const first = Object.values(error.errors)[0]?.[0]
    if (first) {
      return first
    }
  }
  return errorMessage(error, sampleErrorMessages)
}
