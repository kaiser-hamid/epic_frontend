import { apiClient } from "@/lib/api-client"
import type { ResourceResponse } from "@/lib/api-types"
import type { StorageLocation } from "@/modules/blood-bank/storage-locations/types"

/** The session branch's active storage locations, by code; not paginated. */
export async function listStorageLocations(): Promise<StorageLocation[]> {
  const response = await apiClient.get<ResourceResponse<StorageLocation[]>>(
    "/api/blood-bank/storage-locations"
  )
  return response.data.data
}
