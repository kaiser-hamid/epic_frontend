import { ErrorCode, errorMessage, isApiError } from "@/lib/api-error"

/** Blood collection error codes (`modules/BloodBank/Exceptions` `errorCode()` values). */
export const BloodCollectionErrorCode = {
  CaseNotFound: "CASE_NOT_FOUND",
  CaseNotOpen: "CASE_NOT_OPEN",
  CaseDonorNotInCase: "CASE_DONOR_NOT_IN_CASE",
  DonorNotFit: "DONOR_NOT_FIT",
  DonorNotEligible: "DONOR_NOT_ELIGIBLE",
  DonorDeferred: "DONOR_DEFERRED",
  BagAlreadyCollected: "BAG_ALREADY_COLLECTED",
  CaseNeedsNothingMore: "CASE_NEEDS_NOTHING_MORE",
  NotAPhlebotomyCase: "NOT_A_PHLEBOTOMY_CASE",
  CaseDonorIsStockUnit: "CASE_DONOR_IS_STOCK_UNIT",
  CaseDonorNotStockUnit: "CASE_DONOR_NOT_STOCK_UNIT",
  UnitNotHeld: "UNIT_NOT_HELD",
  UnitExpired: "UNIT_EXPIRED",
} as const

/**
 * Codes meaning the screen is out of date (the donor's status or bag, the case, or what it
 * still needs changed meanwhile): toast, then reload it.
 */
export const bloodCollectionReloadCodes: readonly string[] = [
  BloodCollectionErrorCode.BagAlreadyCollected,
  BloodCollectionErrorCode.CaseNotOpen,
  BloodCollectionErrorCode.CaseDonorNotInCase,
  BloodCollectionErrorCode.DonorNotFit,
  BloodCollectionErrorCode.DonorNotEligible,
  BloodCollectionErrorCode.DonorDeferred,
  BloodCollectionErrorCode.CaseNeedsNothingMore,
  BloodCollectionErrorCode.CaseDonorIsStockUnit,
  BloodCollectionErrorCode.CaseDonorNotStockUnit,
  BloodCollectionErrorCode.UnitNotHeld,
]

/** Text for blood collection error codes. */
export const bloodCollectionErrorMessages: Partial<Record<string, string>> = {
  [BloodCollectionErrorCode.CaseNotFound]: "No open case found",
  [BloodCollectionErrorCode.CaseNotOpen]: "Case is closed",
  [BloodCollectionErrorCode.CaseDonorNotInCase]: "Donor is not on this case",
  [BloodCollectionErrorCode.DonorNotFit]: "Physical exam pending",
  [BloodCollectionErrorCode.DonorNotEligible]: "Serology pending",
  [BloodCollectionErrorCode.DonorDeferred]: "Donor deferred",
  [BloodCollectionErrorCode.BagAlreadyCollected]: "Already collected",
  [BloodCollectionErrorCode.CaseNeedsNothingMore]:
    "The case already has every component it was billed for",
  [BloodCollectionErrorCode.NotAPhlebotomyCase]:
    "This case is not billed for Therapeutic Phlebotomy",
  [BloodCollectionErrorCode.CaseDonorIsStockUnit]:
    "This row is a stock bag: print its patient label instead",
  [BloodCollectionErrorCode.CaseDonorNotStockUnit]:
    "This donor is not a stock bag",
  [BloodCollectionErrorCode.UnitNotHeld]:
    "The stock bag is no longer held for this case",
  [BloodCollectionErrorCode.UnitExpired]: "The stock bag has expired",
  [ErrorCode.ReprintReasonRequired]: "Enter a reason to reprint the label.",
  [ErrorCode.Forbidden]: "Not allowed",
  [ErrorCode.NotFound]: "This case was not found.",
  INVALID_QUERY: "This list filter is not supported.",
}

/**
 * Text for a blood collection error. A validation error without a field to sit under (a scan
 * lookup, a label print) shows the server's first field message instead of the generic one.
 */
export function bloodCollectionErrorText(error: unknown): string {
  if (isApiError(error) && error.isValidation) {
    const first = Object.values(error.errors)[0]?.[0]
    if (first) {
      return first
    }
  }
  return errorMessage(error, bloodCollectionErrorMessages)
}
