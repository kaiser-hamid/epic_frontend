import { apiClient } from "@/lib/api-client"
import type {
  ListParams,
  PaginatedResponse,
  ResourceResponse,
} from "@/lib/api-types"
import { emptyToNull } from "@/lib/utils"
import type {
  CaseCreateValues,
  CaseUpdateValues,
} from "@/modules/blood-bank/cases/schemas"
import type {
  BloodBankCase,
  CaseFilters,
} from "@/modules/blood-bank/cases/types"

const basePath = "/api/blood-bank/cases"

export type CaseListParams = Omit<ListParams, "filter"> & {
  filter?: CaseFilters
}

export async function listCases(
  params: CaseListParams
): Promise<PaginatedResponse<BloodBankCase>> {
  const response = await apiClient.get<PaginatedResponse<BloodBankCase>>(
    basePath,
    { params: { include: ["patient"], ...params } }
  )
  return response.data
}

export async function getCase(id: number): Promise<BloodBankCase> {
  const response = await apiClient.get<ResourceResponse<BloodBankCase>>(
    `${basePath}/${id}`,
    { params: { include: ["patient", "components.component_type"] } }
  )
  return response.data.data
}

export async function createCase(
  values: CaseCreateValues
): Promise<BloodBankCase> {
  const response = await apiClient.post<ResourceResponse<BloodBankCase>>(
    basePath,
    {
      ...values,
      transfusion_reason: emptyToNull(values.transfusion_reason),
      reference_note: emptyToNull(values.reference_note),
    }
  )
  return response.data.data
}

/** PATCH with only the changed fields (backend `Optional|type`). */
export async function updateCase(
  id: number,
  changes: Partial<CaseUpdateValues>
): Promise<BloodBankCase> {
  const payload: Record<string, unknown> = { ...changes }
  if ("transfusion_reason" in changes) {
    payload.transfusion_reason = emptyToNull(changes.transfusion_reason)
  }
  if ("reference_note" in changes) {
    payload.reference_note = emptyToNull(changes.reference_note)
  }

  const response = await apiClient.patch<ResourceResponse<BloodBankCase>>(
    `${basePath}/${id}`,
    payload
  )
  return response.data.data
}

/** Status action (backend `CancelCase`); no hard delete. */
export async function cancelCase(
  id: number,
  reason: string
): Promise<BloodBankCase> {
  const response = await apiClient.post<ResourceResponse<BloodBankCase>>(
    `${basePath}/${id}/cancel`,
    { reason }
  )
  return response.data.data
}
