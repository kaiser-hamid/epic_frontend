import { ErrorCode } from "@/lib/api-error"

/** Bill error codes (backend `errorCode()` values). */
export const InvoiceErrorCode = {
  InvoiceCategoryMixed: "INVOICE_CATEGORY_MIXED",
  DiscountPolicyNotAllowed: "DISCOUNT_POLICY_NOT_ALLOWED",
  IdempotencyKeyReused: "IDEMPOTENCY_KEY_REUSED",
  InvoiceNoTaken: "INVOICE_NO_TAKEN",
  PaidAmountExceedsPayable: "PAID_AMOUNT_EXCEEDS_PAYABLE",
  ModuleNotEnabledForBranch: "MODULE_NOT_ENABLED_FOR_BRANCH",
} as const

export const invoiceErrorMessages: Partial<Record<string, string>> = {
  [InvoiceErrorCode.InvoiceCategoryMixed]:
    "Blood Bank items cannot be billed with other items. Bill them separately.",
  [InvoiceErrorCode.DiscountPolicyNotAllowed]:
    "This discount is not available for the selected patient type.",
  [InvoiceErrorCode.IdempotencyKeyReused]:
    "This form was already submitted by another user. Reload the page to start a new bill.",
  [InvoiceErrorCode.InvoiceNoTaken]: "This invoice number is already used.",
  [InvoiceErrorCode.PaidAmountExceedsPayable]:
    "The paid amount can't be more than the payable.",
  [InvoiceErrorCode.ModuleNotEnabledForBranch]:
    "This branch does not run a blood bank, so Blood Bank tests cannot be billed here.",
  INVALID_QUERY: "This list filter is not supported.",
  [ErrorCode.Forbidden]: "You don't have access to this bill.",
}
