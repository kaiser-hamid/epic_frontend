import { apiClient } from "@/lib/api-client"
import type { ResourceResponse } from "@/lib/api-types"
import type { Doctor } from "@/modules/shared/doctor/types"

/** Active doctors whose code or name contains `search`; exact code first, at most 20. */
export async function lookupDoctors(search: string): Promise<Doctor[]> {
  const response = await apiClient.get<ResourceResponse<Doctor[]>>(
    "/api/doctors/lookup",
    { params: { search } }
  )
  return response.data.data
}
