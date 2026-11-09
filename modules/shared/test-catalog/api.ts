import { apiClient } from "@/lib/api-client"
import type { ResourceResponse } from "@/lib/api-types"
import type { TestItemCategory } from "@/modules/shared/test-catalog/enums"
import type { TestItem } from "@/modules/shared/test-catalog/types"

/**
 * Active test items whose code or name contains `search`; exact code first, at most 20.
 * `excludeIds` (the tests already on the form) are never returned; `category` narrows to one
 * kind of item (a Blood Bank bill offers Blood Bank items only).
 */
export async function lookupTestItems(
  search: string,
  excludeIds: readonly number[],
  category?: TestItemCategory
): Promise<TestItem[]> {
  const response = await apiClient.get<ResourceResponse<TestItem[]>>(
    "/api/test-items/lookup",
    { params: { search, "exclude_ids[]": excludeIds, category } }
  )
  return response.data.data
}
