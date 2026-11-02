import { apiClient } from "@/lib/api-client"
import type {
  ListParams,
  PaginatedResponse,
  ResourceResponse,
} from "@/lib/api-types"
import type { BloodBankCase } from "@/modules/blood-bank/cases/types"
import type {
  DonorSerology,
  DonorSerologyInput,
  PendingSerologyFilters,
  SerologyLookup,
} from "@/modules/blood-bank/donor-serology/types"

const basePath = "/api/blood-bank"

export type PendingSerologyListParams = Omit<
  ListParams,
  "filter" | "include"
> & {
  filter?: PendingSerologyFilters
}

export type RecordSerologyInput = {
  caseId: number
  caseDonorId: number
  values: DonorSerologyInput
}

/**
 * A scanned value is a sample no when it starts with "S" (sample tube barcode), otherwise an
 * invoice no (the case bill or a replacement donor's bill).
 */
export function serologyLookup(value: string): SerologyLookup {
  const trimmed = value.trim()
  return /^s/i.test(trimmed) ? { sample_no: trimmed } : { invoice_no: trimmed }
}

/** The serology screen for a scanned invoice or sample. `404 CASE_NOT_FOUND` when none matches. */
export async function findDonorSerology(
  lookup: SerologyLookup
): Promise<DonorSerology> {
  const response = await apiClient.get<ResourceResponse<DonorSerology>>(
    `${basePath}/donor-serology`,
    { params: lookup }
  )
  return response.data.data
}

/** The serology screen of a case (from the Pending tab). */
export async function getDonorSerology(caseId: number): Promise<DonorSerology> {
  const response = await apiClient.get<ResourceResponse<DonorSerology>>(
    `${basePath}/cases/${caseId}/donor-serology`
  )
  return response.data.data
}

/**
 * Saves one donor's serology with the physician's Accept / Defer. Returns the whole refreshed
 * screen. `409 SEROLOGY_LOCKED` once the bag is collected.
 */
export async function recordDonorSerology({
  caseId,
  caseDonorId,
  values,
}: RecordSerologyInput): Promise<DonorSerology> {
  const response = await apiClient.put<ResourceResponse<DonorSerology>>(
    `${basePath}/cases/${caseId}/donors/${caseDonorId}/serology`,
    values
  )
  return response.data.data
}

/** Open cases with an accepted donor whose sample is collected and who has no serology decision. */
export async function listPendingSerology(
  params: PendingSerologyListParams
): Promise<PaginatedResponse<BloodBankCase>> {
  const response = await apiClient.get<PaginatedResponse<BloodBankCase>>(
    `${basePath}/donor-serology/pending`,
    { params }
  )
  return response.data
}
