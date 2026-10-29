import { apiClient } from "@/lib/api-client"
import type { PaginatedResponse, ResourceResponse } from "@/lib/api-types"
import type { Donor } from "@/modules/blood-bank/donors/types"

const basePath = "/api/blood-bank/donors"

/** Donors of every branch, by name, phone, donor no or national id (`filter[search]`). */
export async function searchDonors(search: string): Promise<Donor[]> {
  const response = await apiClient.get<PaginatedResponse<Donor>>(basePath, {
    params: { filter: { search }, per_page: 10 },
  })
  return response.data.data
}

/**
 * Exact phone match across branches, newest first, at most 10. A number can be shared, so
 * this can return several. Ages are as of today.
 */
export async function findDonorsByPhone(phone: string): Promise<Donor[]> {
  const response = await apiClient.get<ResourceResponse<Donor[]>>(
    `${basePath}/lookup`,
    { params: { phone } }
  )
  return response.data.data
}
