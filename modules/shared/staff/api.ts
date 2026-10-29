import { apiClient } from "@/lib/api-client"
import type { ResourceResponse } from "@/lib/api-types"
import type { Staff } from "@/modules/shared/staff/types"

/** Active staff whose employee id or name contains `search`; exact employee id first, at most 20. */
export async function lookupStaff(search: string): Promise<Staff[]> {
  const response = await apiClient.get<ResourceResponse<Staff[]>>(
    "/api/staff/lookup",
    { params: { search } }
  )
  return response.data.data
}
