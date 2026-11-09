import type { BillingStatus } from "@/modules/shared/billing/enums"
import type { Patient } from "@/modules/shared/patient/types"
import type { TestItemCategory } from "@/modules/shared/test-catalog/enums"

/** Money fields are integer paisa. Percentages are plain numbers (25 = 25%). */

export type InvoiceDiscount = {
  discount_policy_id: number
  /** Snapshot of the policy name when billed. */
  name: string
  discount_percent: number
  amount: number
}

/** `InvoiceItemResource`. `amount` is rate × quantity; `net_amount` is after the line discount. */
export type InvoiceItem = {
  id: number
  test_item_id: number
  code?: string
  name?: string
  department_name?: string | null
  quantity: number
  rate: number
  amount: number
  /** Null when the bill has no discount policy. */
  discount_percent: number | null
  discount_amount: number
  net_amount: number
}

type ReferralDoctor = { id: number; name: string } & Record<string, unknown>

export type InvoiceReferral = {
  is_self_referral: boolean
  doctor?: ReferralDoctor | null
  second_doctor?: ReferralDoctor | null
  remark: string | null
  referred_by_staff?: { id: number; name: string } | null
}

/**
 * `InvoiceResource`. `amount` is the payable: subtotal − discount + rounding (the payable drops
 * the paisa and rounds up to the next 10 taka). Relations are present on the detail and create
 * responses; list rows carry `patient` and `patient_type`.
 */
export type Invoice = {
  id: number
  invoice_no: string
  branch_id: number
  category: TestItemCategory
  status: BillingStatus
  patient_type?: { id: number; code: string; name: string }
  discount?: InvoiceDiscount | null
  subtotal_amount: number
  discount_amount: number
  /** Signed. */
  rounding_amount: number
  amount: number
  /** Paid at the counter when billed. */
  paid_amount: number
  /** `amount` − `paid_amount`. */
  due_amount: number
  billed_at: string
  /** When the reports will be ready; null only on bills saved before it was asked. */
  delivery_at: string | null
  patient?: Patient
  referral?: InvoiceReferral | null
  items?: InvoiceItem[]
  created_by?: { id: number; name: string }
  created_at: string | null
}

/** `InvoiceQuoteResource`: the totals the server would bill, nothing saved. */
export type InvoiceQuote = {
  category: TestItemCategory
  discount_policy: { id: number; name: string; discount_percent: number } | null
  subtotal_amount: number
  discount_amount: number
  rounding_amount: number
  amount: number
  items: Omit<InvoiceItem, "id" | "code" | "name" | "department_name">[]
}

export type DiscountPolicy = {
  id: number
  code: string
  name: string
  type: "percentage"
  discount_percent: number
}

/** `PatientTypeResource`: an active patient type with its active discount policies. */
export type PatientType = {
  id: number
  code: string
  name: string
  discount_policies: DiscountPolicy[]
}

/** The "General Patient" type every bill starts with. */
export const GENERAL_PATIENT_TYPE_CODE = "GENERAL"

/** Filters the backend allows on `GET /api/billing/invoices`. */
export type InvoiceFilters = {
  invoice_no?: string | null
  /** Patient name, phone or patient no (partial). */
  search?: string | null
  status?: BillingStatus | null
  category?: TestItemCategory | null
  /** `YYYY-MM-DD`, inclusive. */
  billed_from?: string | null
  billed_to?: string | null
}

/** Sorts the backend allows. Column ids in the table use the same names. */
export const invoiceSortableColumns = ["billed_at", "invoice_no"] as const
