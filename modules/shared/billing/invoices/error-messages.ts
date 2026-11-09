import { ErrorCode } from "@/lib/api-error"

/** Bill error codes (backend `errorCode()` values). */
export const InvoiceErrorCode = {
  InvoiceCategoryMixed: "INVOICE_CATEGORY_MIXED",
  DiscountPolicyNotAllowed: "DISCOUNT_POLICY_NOT_ALLOWED",
  IdempotencyKeyReused: "IDEMPOTENCY_KEY_REUSED",
  InvoiceNoTaken: "INVOICE_NO_TAKEN",
} as const

export const invoiceErrorMessages: Partial<Record<string, string>> = {
  [InvoiceErrorCode.InvoiceCategoryMixed]:
    "Blood Bank items cannot be billed with other items. Bill them separately.",
  [InvoiceErrorCode.DiscountPolicyNotAllowed]:
    "This discount is not available for the selected patient type.",
  [InvoiceErrorCode.IdempotencyKeyReused]:
    "This form was already submitted by another user. Reload the page to start a new bill.",
  [InvoiceErrorCode.InvoiceNoTaken]: "This invoice number is already used.",
  INVALID_QUERY: "This list filter is not supported.",
  [ErrorCode.Forbidden]: "You don't have access to this bill.",
}
