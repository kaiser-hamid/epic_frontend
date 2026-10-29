import { apiClient } from "@/lib/api-client"
import type { PaginatedResponse, ResourceResponse } from "@/lib/api-types"
import type { Patient } from "@/modules/shared/patient/types"

const basePath = "/api/patients"

/** Search by patient no, name or phone (`filter[search]`). */
export async function searchPatients(search: string): Promise<Patient[]> {
  const response = await apiClient.get<PaginatedResponse<Patient>>(basePath, {
    params: { filter: { search }, per_page: 10 },
  })
  return response.data.data
}

/**
 * Exact phone match across branches, newest first, at most 10. Family members can share a
 * number, so this can return several. Ages are as of today.
 */
export async function findPatientsByPhone(phone: string): Promise<Patient[]> {
  const response = await apiClient.get<ResourceResponse<Patient[]>>(
    `${basePath}/lookup`,
    { params: { phone } }
  )
  return response.data.data
}

export async function getPatient(id: number): Promise<Patient> {
  const response = await apiClient.get<ResourceResponse<Patient>>(
    `${basePath}/${id}`
  )
  return response.data.data
}
