/** Mirrors the backend `Modules\Shared\Billing\Enums\BillingStatus`. Values must match exactly. */
export const BillingStatus = {
  Active: "active",
  Cancelled: "cancelled",
} as const
export type BillingStatus = (typeof BillingStatus)[keyof typeof BillingStatus]

export const billingStatusLabels: Record<BillingStatus, string> = {
  active: "Active",
  cancelled: "Cancelled",
}
