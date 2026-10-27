import { apiClient } from "@/lib/api-client"
import type { PaginatedResponse } from "@/lib/api-types"
import type { ComponentType } from "@/modules/blood-bank/component-types/types"

export async function listActiveComponentTypes(): Promise<ComponentType[]> {
  const response = await apiClient.get<PaginatedResponse<ComponentType>>(
    "/api/blood-bank/component-types",
    { params: { filter: { is_active: true }, sort: "name", per_page: 100 } }
  )
  return response.data.data
}
