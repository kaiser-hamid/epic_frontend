import { apiClient } from "@/lib/api-client"
import type { ListParams, PaginatedResponse } from "@/lib/api-types"
import type {
  UserAccess,
  UserAccessFilters,
} from "@/modules/user-management/permissions/types"

export type UserAccessListParams = Omit<
  ListParams,
  "filter" | "include" | "sort"
> & {
  filter?: UserAccessFilters
}

/** Users by name with their permission totals and matched role templates per branch. Needs `sh.user.assign_permissions`. */
export async function listUserAccess(
  params: UserAccessListParams
): Promise<PaginatedResponse<UserAccess>> {
  const response = await apiClient.get<PaginatedResponse<UserAccess>>(
    "/api/access/user-access",
    { params }
  )
  return response.data
}
