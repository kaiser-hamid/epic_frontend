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

export async function getPatient(id: number): Promise<Patient> {
  const response = await apiClient.get<ResourceResponse<Patient>>(
    `${basePath}/${id}`
  )
  return response.data.data
}
