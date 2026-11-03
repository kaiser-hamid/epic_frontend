import { ErrorCode, errorMessage, isApiError } from "@/lib/api-error"

/** Blood issue error codes (`modules/BloodBank/Exceptions` `errorCode()` values). */
export const BloodIssueErrorCode = {
  CaseNotFound: "CASE_NOT_FOUND",
  CaseNotOpen: "CASE_NOT_OPEN",
  UnitNotInCase: "UNIT_NOT_IN_CASE",
  UnitNotReserved: "UNIT_NOT_RESERVED",
  UnitExpired: "UNIT_EXPIRED",
  CrossmatchIncompatible: "CROSSMATCH_INCOMPATIBLE",
  PatientSampleNotCollected: "PATIENT_SAMPLE_NOT_COLLECTED",
  AmendmentReasonRequired: "AMENDMENT_REASON_REQUIRED",
  CaseDonorNotInCase: "CASE_DONOR_NOT_IN_CASE",
  PostDonationVitalsRequired: "POST_DONATION_VITALS_REQUIRED",
  PostDonationVitalsRecorded: "POST_DONATION_VITALS_RECORDED",
  CrossmatchNotRecorded: "CROSSMATCH_NOT_RECORDED",
} as const

/**
 * Codes meaning the screen is out of date (a unit was issued or expired, the case closed, a
 * donor's vitals or bag changed meanwhile): toast, close the form, reload the screen. Every
 * 409 counts too (see `isBloodIssueReloadError`).
 */
const reloadCodes: readonly string[] = [
  BloodIssueErrorCode.CaseNotOpen,
  BloodIssueErrorCode.UnitNotInCase,
  BloodIssueErrorCode.UnitNotReserved,
  BloodIssueErrorCode.UnitExpired,
  BloodIssueErrorCode.PatientSampleNotCollected,
  BloodIssueErrorCode.CaseDonorNotInCase,
  BloodIssueErrorCode.PostDonationVitalsRequired,
  BloodIssueErrorCode.PostDonationVitalsRecorded,
]

export function isBloodIssueReloadError(error: unknown): boolean {
  return (
    isApiError(error) &&
    (error.status === 409 || reloadCodes.includes(error.code))
  )
}

/** Text for blood issue error codes. */
export const bloodIssueErrorMessages: Partial<Record<string, string>> = {
  [BloodIssueErrorCode.CaseNotFound]:
    "No case found for this invoice or donor number.",
  [BloodIssueErrorCode.CaseNotOpen]:
    "This case is closed; blood can no longer be issued.",
  [BloodIssueErrorCode.UnitNotInCase]:
    "A selected unit does not belong to this case.",
  [BloodIssueErrorCode.UnitNotReserved]:
    "A selected unit is no longer reserved (it may already be issued).",
  [BloodIssueErrorCode.UnitExpired]:
    "A selected unit has expired and cannot be issued.",
  [BloodIssueErrorCode.CrossmatchIncompatible]:
    "An incompatible unit cannot be issued.",
  [BloodIssueErrorCode.PatientSampleNotCollected]:
    "Collect the patient sample first.",
  [BloodIssueErrorCode.AmendmentReasonRequired]:
    "Enter a reason for changing the blood group.",
  [BloodIssueErrorCode.CaseDonorNotInCase]:
    "A donor does not belong to this case.",
  [BloodIssueErrorCode.PostDonationVitalsRequired]:
    "Enter post-donation vitals for every donor whose blood is issued.",
  [BloodIssueErrorCode.PostDonationVitalsRecorded]:
    "Post-donation vitals are already recorded for this donor. Refresh.",
  [BloodIssueErrorCode.CrossmatchNotRecorded]:
    "This unit has no Compatibility Test Report yet.",
  [ErrorCode.ReprintReasonRequired]: "Enter a reason for the reprint.",
  [ErrorCode.Forbidden]: "You don't have access to this case.",
  [ErrorCode.NotFound]: "This case was not found.",
  INVALID_QUERY: "This list filter is not supported.",
}

/**
 * Text for a blood issue error. A validation error without a field to sit under (a scan
 * lookup) shows the server's first field message instead of the generic one.
 */
export function bloodIssueErrorText(error: unknown): string {
  if (isApiError(error) && error.isValidation) {
    const first = Object.values(error.errors)[0]?.[0]
    if (first) {
      return first
    }
  }
  return errorMessage(error, bloodIssueErrorMessages)
}
