import { ErrorCode } from "@/lib/api-error"

/** Bill error codes (backend `errorCode()` values). */
export const InvoiceErrorCode = {
  DiscountPolicyNotAllowed: "DISCOUNT_POLICY_NOT_ALLOWED",
  IdempotencyKeyReused: "IDEMPOTENCY_KEY_REUSED",
  InvoiceNoTaken: "INVOICE_NO_TAKEN",
  PaidAmountExceedsPayable: "PAID_AMOUNT_EXCEEDS_PAYABLE",
  ModuleNotEnabledForBranch: "MODULE_NOT_ENABLED_FOR_BRANCH",
  ServicesNotCombinable: "SERVICES_NOT_COMBINABLE",
} as const

export const invoiceErrorMessages: Partial<Record<string, string>> = {
  [InvoiceErrorCode.DiscountPolicyNotAllowed]:
    "This discount is not available for the selected patient type.",
  [InvoiceErrorCode.IdempotencyKeyReused]:
    "This form was already submitted by another user. Reload the page to start a new bill.",
  [InvoiceErrorCode.InvoiceNoTaken]: "This invoice number is already used.",
  [InvoiceErrorCode.PaidAmountExceedsPayable]:
    "The paid amount can't be more than the payable.",
  [InvoiceErrorCode.ModuleNotEnabledForBranch]:
    "This branch does not run a blood bank, so Blood Bank tests cannot be billed here.",
  [InvoiceErrorCode.ServicesNotCombinable]:
    "One bill, one Blood Bank service: Autologous PRP or Therapeutic Phlebotomy is billed on its own, without components or another procedure.",
  INVALID_QUERY: "This list filter is not supported.",
  [ErrorCode.Forbidden]: "You don't have access to this bill.",
}
