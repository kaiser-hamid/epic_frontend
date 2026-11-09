import { apiClient } from "@/lib/api-client"
import type {
  ListParams,
  PaginatedResponse,
  ResourceResponse,
} from "@/lib/api-types"
import { emptyToNull } from "@/lib/utils"
import {
  invoiceCategory,
  type InvoiceValues,
  type NewPatientValues,
  type TestLineValues,
} from "@/modules/shared/billing/invoices/schemas"
import type {
  Invoice,
  InvoiceFilters,
  InvoiceQuote,
  PatientType,
} from "@/modules/shared/billing/invoices/types"
import { TestItemCategory } from "@/modules/shared/test-catalog/enums"

const basePath = "/api/billing"

export type InvoiceListParams = Omit<ListParams, "filter" | "include"> & {
  filter?: InvoiceFilters
}

/** Newest first by default. Rows embed the patient and patient type. */
export async function listInvoices(
  params: InvoiceListParams
): Promise<PaginatedResponse<Invoice>> {
  const response = await apiClient.get<PaginatedResponse<Invoice>>(
    `${basePath}/invoices`,
    { params }
  )
  return response.data
}

export async function getInvoice(id: number): Promise<Invoice> {
  const response = await apiClient.get<ResourceResponse<Invoice>>(
    `${basePath}/invoices/${id}`
  )
  return response.data.data
}

/** Active patient types with their active discount policies. */
export async function listPatientTypes(): Promise<PatientType[]> {
  const response = await apiClient.get<ResourceResponse<PatientType[]>>(
    `${basePath}/patient-types`
  )
  return response.data.data
}

export type QuoteInput = {
  items: { test_item_id: number; quantity: number }[]
  patient_type_id: number
  discount_policy_id?: number
}

/** The totals the server would bill for these lines; nothing is saved. */
export async function quoteInvoice(input: QuoteInput): Promise<InvoiceQuote> {
  const response = await apiClient.post<ResourceResponse<InvoiceQuote>>(
    `${basePath}/invoices/quote`,
    input
  )
  return response.data.data
}

function newPatientPayload(patient: NewPatientValues) {
  return {
    title: patient.title || null,
    name: patient.name.trim(),
    age_years: patient.age_years,
    age_months: patient.age_months,
    age_days: patient.age_days,
    date_of_birth: patient.date_of_birth || null,
    gender: patient.gender || null,
    marital_status: patient.marital_status || null,
    blood_group: patient.blood_group || null,
    phone: emptyToNull(patient.phone),
    address: emptyToNull(patient.address),
    national_id: emptyToNull(patient.national_id),
  }
}

/** Picked lines → `{ test_item_id, quantity }`, skipping rows without a test yet. */
export function billedLines(lines: readonly Partial<TestLineValues>[]) {
  return lines.flatMap((line) =>
    line.test_item_id === undefined || !line.quantity
      ? []
      : [{ test_item_id: line.test_item_id, quantity: line.quantity }]
  )
}

/**
 * Form values → request body. Sends exactly one of `patient_id` (found by phone) / `patient`,
 * test lines without their display-only `item`, no `doctor_id` on a self referral, the typed
 * invoice no only when given, and `category_details` only on a Blood Bank bill (empty values
 * dropped, so the server reports what is missing). Empty optional numbers stay `undefined` and
 * are dropped from the JSON.
 */
export function toCreateInvoicePayload(
  values: InvoiceValues,
  idempotencyKey: string
) {
  const { referral } = values
  const isBloodBank =
    invoiceCategory(values.items) === TestItemCategory.BloodBank

  return {
    idempotency_key: idempotencyKey,
    invoice_no: values.invoice_no.trim() || undefined,
    ...(values.patient_id !== undefined
      ? { patient_id: values.patient_id }
      : { patient: newPatientPayload(values.patient) }),
    items: billedLines(values.items),
    referral: {
      is_self_referral: referral.is_self_referral,
      doctor_id: referral.is_self_referral ? undefined : referral.doctor_id,
      second_doctor_id: referral.second_doctor_id,
      remark: emptyToNull(referral.remark),
      referred_by_staff_id: referral.referred_by_staff_id,
    },
    patient_type_id: values.patient_type_id,
    discount_policy_id: values.discount_policy_id,
    category_details: isBloodBank
      ? Object.fromEntries(
          Object.entries(values.category_details).filter(
            ([, value]) => value !== undefined && value !== ""
          )
        )
      : undefined,
  }
}

export type CreateInvoiceInput = {
  values: InvoiceValues
  /** One per form session: a resubmit returns the bill already saved instead of a second one. */
  idempotencyKey: string
}

/**
 * Saves the bill (registering a new patient if needed). A Blood Bank bill also opens its case
 * in the same transaction.
 */
export async function createInvoice({
  values,
  idempotencyKey,
}: CreateInvoiceInput): Promise<Invoice> {
  const response = await apiClient.post<ResourceResponse<Invoice>>(
    `${basePath}/invoices`,
    toCreateInvoicePayload(values, idempotencyKey)
  )
  return response.data.data
}

export type PrintInvoiceInput = { id: number; reprintReason?: string }

/** Logs the print and returns the bill PDF. `REPRINT_REASON_REQUIRED` once printed before. */
export async function printInvoice({
  id,
  reprintReason,
}: PrintInvoiceInput): Promise<Blob> {
  const response = await apiClient.post<Blob>(
    `${basePath}/invoices/${id}/print`,
    { reprint_reason: reprintReason?.trim() || null },
    { responseType: "blob" }
  )
  return response.data
}
