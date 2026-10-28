import { apiClient } from "@/lib/api-client"
import type { PaginatedResponse } from "@/lib/api-types"
import type { Donor } from "@/modules/blood-bank/donors/types"

/** Donors of every branch, by name, phone, donor no or national id (`filter[search]`). */
export async function searchDonors(search: string): Promise<Donor[]> {
  const response = await apiClient.get<PaginatedResponse<Donor>>(
    "/api/blood-bank/donors",
    { params: { filter: { search }, per_page: 10 } }
  )
  return response.data.data
}
