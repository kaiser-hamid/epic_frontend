import { ErrorCode, errorMessage, isApiError } from "@/lib/api-error"

/** Add donor error codes (backend `errorCode()` values). */
export const AddDonorErrorCode = {
  CaseNotFound: "CASE_NOT_FOUND",
  CaseNotOpen: "CASE_NOT_OPEN",
  DonorAlreadyInCase: "DONOR_ALREADY_IN_CASE",
  InvoiceNotFound: "INVOICE_NOT_FOUND",
  InvoiceNotInBranch: "INVOICE_NOT_IN_BRANCH",
  InvoiceNotActive: "INVOICE_NOT_ACTIVE",
  InvoicePatientMismatch: "INVOICE_PATIENT_MISMATCH",
  InvoiceLinkedToOtherCase: "INVOICE_LINKED_TO_OTHER_CASE",
} as const

/** Codes about the donor's bill: shown under the invoice no field. */
export const addDonorInvoiceErrorCodes: readonly string[] = [
  AddDonorErrorCode.InvoiceNotFound,
  AddDonorErrorCode.InvoiceNotInBranch,
  AddDonorErrorCode.InvoiceNotActive,
  AddDonorErrorCode.InvoicePatientMismatch,
  AddDonorErrorCode.InvoiceLinkedToOtherCase,
]

export const addDonorErrorMessages: Partial<Record<string, string>> = {
  [AddDonorErrorCode.CaseNotFound]:
    "No case found for this invoice in this branch.",
  [AddDonorErrorCode.CaseNotOpen]:
    "This case is closed — donors cannot be added. The page has been refreshed.",
  [AddDonorErrorCode.DonorAlreadyInCase]:
    "This donor is already on the case. Add someone else.",
  [AddDonorErrorCode.InvoiceNotFound]:
    "No bill with this invoice no. Save the bill in Billing first.",
  [AddDonorErrorCode.InvoiceNotInBranch]:
    "This bill belongs to another branch.",
  [AddDonorErrorCode.InvoiceNotActive]: "This bill is cancelled.",
  [AddDonorErrorCode.InvoicePatientMismatch]:
    "This bill is for another patient.",
  [AddDonorErrorCode.InvoiceLinkedToOtherCase]:
    "This bill already belongs to another case.",
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
