import { apiClient } from "@/lib/api-client"
import type {
  ListParams,
  PaginatedResponse,
  ResourceResponse,
} from "@/lib/api-types"
import type { Bag } from "@/modules/blood-bank/blood-collections/types"
import type {
  ComponentPreparation,
  PrepareUnitsInput,
  Unit,
  UnitFilters,
  UnitLabel,
} from "@/modules/blood-bank/units/types"

const basePath = "/api/blood-bank"

export type UnitListParams = Omit<ListParams, "filter" | "include"> & {
  filter?: UnitFilters
}

export type PendingPreparationListParams = Omit<
  ListParams,
  "filter" | "include"
>

export type PreparationRef = { caseId: number; bagId: number }

export type PrintUnitLabelsInput = {
  caseId: number
  unitIds: number[]
  /** Required when any of the labels was printed before. */
  reprintReason?: string
}

/** The preparation screen for a scanned bag label. `404 BAG_NOT_FOUND` when none matches. */
export async function findComponentPreparation(
  bagNo: string
): Promise<ComponentPreparation> {
  const response = await apiClient.get<ResourceResponse<ComponentPreparation>>(
    `${basePath}/component-preparation`,
    { params: { bag_no: bagNo.trim() } }
  )
  return response.data.data
}

/** The preparation screen of a bag (from the Pending tab). */
export async function getComponentPreparation({
  caseId,
  bagId,
}: PreparationRef): Promise<ComponentPreparation> {
  const response = await apiClient.get<ResourceResponse<ComponentPreparation>>(
    `${basePath}/cases/${caseId}/bags/${bagId}/component-preparation`
  )
  return response.data.data
}

/**
 * Turns the bag into units, once (201). Returns the whole refreshed screen with
 * `prepared_unit_ids` set to the new units.
 */
export async function prepareUnits(
  { caseId, bagId }: PreparationRef,
  input: PrepareUnitsInput
): Promise<ComponentPreparation> {
  const response = await apiClient.post<ResourceResponse<ComponentPreparation>>(
    `${basePath}/cases/${caseId}/bags/${bagId}/units`,
    input
  )
  return response.data.data
}

/**
 * Logs the print of one or more component labels of a case (all or none) and returns what
 * goes on each. `422 REPRINT_REASON_REQUIRED` when one was printed before and no reason is
 * given.
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

/** Collected bags of the branch with no units yet, oldest first by default. */
export async function listPendingPreparations(
  params: PendingPreparationListParams
): Promise<PaginatedResponse<Bag>> {
  const response = await apiClient.get<PaginatedResponse<Bag>>(
    `${basePath}/component-preparation/pending`,
    { params }
  )
  return response.data
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
