import { ErrorCode, errorMessage, isApiError } from "@/lib/api-error"

/** Add donor error codes (backend `errorCode()` values). */
export const AddDonorErrorCode = {
  CaseNotFound: "CASE_NOT_FOUND",
  CaseNotOpen: "CASE_NOT_OPEN",
  InvoiceNoTaken: "INVOICE_NO_TAKEN",
  DonorAlreadyInCase: "DONOR_ALREADY_IN_CASE",
} as const

export const addDonorErrorMessages: Partial<Record<string, string>> = {
  [AddDonorErrorCode.CaseNotFound]:
    "No case found for this invoice in this branch.",
  [AddDonorErrorCode.CaseNotOpen]:
    "This case is closed — donors cannot be added. The page has been refreshed.",
  [AddDonorErrorCode.InvoiceNoTaken]: "This invoice number is already used.",
  [AddDonorErrorCode.DonorAlreadyInCase]:
    "This donor is already on the case. Add someone else.",
  [ErrorCode.Forbidden]: "You don't have access to this case.",
}

/**
 * Text for an Add donor error. A validation error without a field to sit under (the invoice
 * scan) shows the server's first field message instead of the generic one.
 */
export function addDonorErrorText(error: unknown): string {
  if (isApiError(error) && error.isValidation) {
    const first = Object.values(error.errors)[0]?.[0]
    if (first) {
      return first
    }
  }
  return errorMessage(error, addDonorErrorMessages)
}
