import { apiClient } from "@/lib/api-client"
import type { ResourceResponse } from "@/lib/api-types"
import type { ComponentType } from "@/modules/blood-bank/component-types/types"

/** All active component types, sorted by name; not paginated. */
export async function listComponentTypes(): Promise<ComponentType[]> {
  const response = await apiClient.get<ResourceResponse<ComponentType[]>>(
    "/api/blood-bank/component-types"
  )
  return response.data.data
}
