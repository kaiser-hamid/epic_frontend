import { apiClient } from "@/lib/api-client"
import type {
  ListParams,
  PaginatedResponse,
  ResourceResponse,
} from "@/lib/api-types"
import type { BloodBankCase } from "@/modules/blood-bank/cases/types"
import type {
  DonorExamination,
  PendingExaminationFilters,
  PhysicalExaminationInput,
} from "@/modules/blood-bank/donor-examinations/types"

const basePath = "/api/blood-bank"

export type PendingExaminationListParams = Omit<
  ListParams,
  "filter" | "include"
> & {
  filter?: PendingExaminationFilters
}

export type RecordExaminationInput = {
  caseId: number
  caseDonorId: number
  values: PhysicalExaminationInput
}

/**
 * The examination screen for a scanned invoice: the case bill or a replacement donor's bill.
 * `404 CASE_NOT_FOUND` when no case of the session branch matches.
 */
export async function findDonorExaminationByInvoice(
  invoiceNo: string
): Promise<DonorExamination> {
  const response = await apiClient.get<ResourceResponse<DonorExamination>>(
    `${basePath}/donor-examination`,
    { params: { invoice_no: invoiceNo } }
  )
  return response.data.data
}

/** The examination screen of a case (from the Pending tab). */
export async function getDonorExamination(
  caseId: number
): Promise<DonorExamination> {
  const response = await apiClient.get<ResourceResponse<DonorExamination>>(
    `${basePath}/cases/${caseId}/donor-examination`
  )
  return response.data.data
}

/**
 * Saves one donor's examination with the physician's Accept / Defer. Returns the whole
 * refreshed screen. `409 EXAMINATION_LOCKED` once the donor sample is drawn.
 */
export async function recordPhysicalExamination({
  caseId,
  caseDonorId,
  values,
}: RecordExaminationInput): Promise<DonorExamination> {
  const response = await apiClient.put<ResourceResponse<DonorExamination>>(
    `${basePath}/cases/${caseId}/donors/${caseDonorId}/physical-examination`,
    values
  )
  return response.data.data
}

/** Open cases of the branch with a donor not examined yet, oldest first by default. */
export async function listPendingExaminations(
  params: PendingExaminationListParams
): Promise<PaginatedResponse<BloodBankCase>> {
  const response = await apiClient.get<PaginatedResponse<BloodBankCase>>(
    `${basePath}/donor-examination/pending`,
    { params }
  )
  return response.data
}
