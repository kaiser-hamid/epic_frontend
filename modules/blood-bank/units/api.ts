import { apiClient } from "@/lib/api-client"
import type {
  ListParams,
  PaginatedResponse,
  ResourceResponse,
} from "@/lib/api-types"
import type {
  Unit,
  UnitFilters,
  UnitLabel,
} from "@/modules/blood-bank/units/types"

const basePath = "/api/blood-bank"

export type UnitListParams = Omit<ListParams, "filter" | "include"> & {
  filter?: UnitFilters
}

export type PrintUnitLabelsInput = {
  /** The case the units' bag was collected for (`Unit.bag_case_id`). */
  caseId: number
  unitIds: number[]
  /** Required when any of the labels was printed before. */
  reprintReason?: string
}

/**
 * Logs the print of one or more unit labels of a case (all or none) and returns what goes on
 * each: the patient label for a unit reserved for a patient, the storage label for stock.
 * `422 REPRINT_REASON_REQUIRED` when one was printed before and no reason is given.
 */
export async function printUnitLabels({
  caseId,
  unitIds,
  reprintReason,
}: PrintUnitLabelsInput): Promise<UnitLabel[]> {
  const response = await apiClient.post<ResourceResponse<UnitLabel[]>>(
    `${basePath}/cases/${caseId}/unit-labels`,
    { unit_ids: unitIds, reprint_reason: reprintReason?.trim() || null }
  )
  return response.data.data
}

/** Blood units of the branch, soonest expiry first by default. */
export async function listUnits(
  params: UnitListParams
): Promise<PaginatedResponse<Unit>> {
  const response = await apiClient.get<PaginatedResponse<Unit>>(
    `${basePath}/units`,
    { params }
  )
  return response.data
}
