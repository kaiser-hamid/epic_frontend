import { apiClient } from "@/lib/api-client"
import type { ResourceResponse } from "@/lib/api-types"
import { newDonorPayload } from "@/modules/blood-bank/cases/api"
import type { BloodBankCase } from "@/modules/blood-bank/cases/types"
import type { AddDonorValues } from "@/modules/blood-bank/case-donors/schemas"

const basePath = "/api/blood-bank"

/**
 * The case detail for a scanned invoice: the case bill or a bill already issued for an added
 * donor. `404 CASE_NOT_FOUND` when no case of the session branch matches.
 */
export async function findCaseForAddDonor(
  invoiceNo: string
): Promise<BloodBankCase> {
  const response = await apiClient.get<ResourceResponse<BloodBankCase>>(
    `${basePath}/add-donor`,
    { params: { invoice_no: invoiceNo } }
  )
  return response.data.data
}

/** Form values → body: the new invoice no plus exactly one of `donor_id` / `donor`. */
export function toAddDonorPayload(values: AddDonorValues) {
  const [entry] = values.donors
  return {
    invoice_no: values.invoice_no.trim(),
    ...(entry.donor_id !== undefined
      ? { donor_id: entry.donor_id }
      : { donor: newDonorPayload(entry.donor) }),
  }
}

export type AddCaseDonorInput = { caseId: number; values: AddDonorValues }

/**
 * Adds one donor to an open case, billed on its own vendor invoice. Returns the updated case
 * detail (the new donor last, `registered`).
 */
export async function addCaseDonor({
  caseId,
  values,
}: AddCaseDonorInput): Promise<BloodBankCase> {
  const response = await apiClient.post<ResourceResponse<BloodBankCase>>(
    `${basePath}/cases/${caseId}/donors`,
    toAddDonorPayload(values)
  )
  return response.data.data
}
