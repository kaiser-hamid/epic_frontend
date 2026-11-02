import { apiClient } from "@/lib/api-client"
import type {
  ListParams,
  PaginatedResponse,
  ResourceResponse,
} from "@/lib/api-types"
import type {
  Bag,
  BagFilters,
  BagLabel,
  BloodCollection,
  BloodCollectionLookup,
  CollectBloodInput,
  PendingBloodCollectionFilters,
} from "@/modules/blood-bank/blood-collections/types"
import type { BloodBankCase } from "@/modules/blood-bank/cases/types"

const basePath = "/api/blood-bank"

export type BagListParams = Omit<ListParams, "filter" | "include"> & {
  filter?: BagFilters
}

export type PendingBloodCollectionListParams = Omit<
  ListParams,
  "filter" | "include"
> & {
  filter?: PendingBloodCollectionFilters
}

export type CollectBloodRequest = {
  caseDonorId: number
  values: CollectBloodInput
}

export type PrintBagLabelsInput = {
  caseId: number
  collectionIds: number[]
  /** Required when any of the labels was printed before. */
  reprintReason?: string
}

/**
 * A scanned value is a donor no when it starts with "D" (the donor card), otherwise an
 * invoice no (the case bill or an added donor's bill).
 */
export function bloodCollectionLookup(value: string): BloodCollectionLookup {
  const trimmed = value.trim()
  return /^d/i.test(trimmed) ? { donor_no: trimmed } : { invoice_no: trimmed }
}

/**
 * The collection screen for a scanned invoice (every donor of the case) or donor no (only
 * that donor, on their latest open case). `404 CASE_NOT_FOUND` when none matches.
 */
export async function findBloodCollection(
  lookup: BloodCollectionLookup
): Promise<BloodCollection> {
  const response = await apiClient.get<ResourceResponse<BloodCollection>>(
    `${basePath}/blood-collection`,
    { params: lookup }
  )
  return response.data.data
}

/** The collection screen of a case (from the Pending tab), every donor. */
export async function getBloodCollection(
  caseId: number
): Promise<BloodCollection> {
  const response = await apiClient.get<ResourceResponse<BloodCollection>>(
    `${basePath}/cases/${caseId}/blood-collection`
  )
  return response.data.data
}

/**
 * Collects blood from one eligible donor into a new bag (201). Returns the whole refreshed
 * screen with `collected_collection_id` set to the new bag.
 */
export async function collectBlood(
  caseId: number,
  { caseDonorId, values }: CollectBloodRequest
): Promise<BloodCollection> {
  const response = await apiClient.post<ResourceResponse<BloodCollection>>(
    `${basePath}/cases/${caseId}/donors/${caseDonorId}/collection`,
    values
  )
  return response.data.data
}

/**
 * Logs the print of one or more bag labels of a case (all or none) and returns what goes on
 * each. `422 REPRINT_REASON_REQUIRED` when one was printed before and no reason is given.
 */
export async function printBagLabels({
  caseId,
  collectionIds,
  reprintReason,
}: PrintBagLabelsInput): Promise<BagLabel[]> {
  const response = await apiClient.post<ResourceResponse<BagLabel[]>>(
    `${basePath}/cases/${caseId}/bag-labels`,
    {
      collection_ids: collectionIds,
      reprint_reason: reprintReason?.trim() || null,
    }
  )
  return response.data.data
}

/** Open cases with a donor cleared at serology and not yet bled, oldest first by default. */
export async function listPendingBloodCollections(
  params: PendingBloodCollectionListParams
): Promise<PaginatedResponse<BloodBankCase>> {
  const response = await apiClient.get<PaginatedResponse<BloodBankCase>>(
    `${basePath}/blood-collection/pending`,
    { params }
  )
  return response.data
}

/** Blood bags of the branch's cases, newest first by default. */
export async function listBags(
  params: BagListParams
): Promise<PaginatedResponse<Bag>> {
  const response = await apiClient.get<PaginatedResponse<Bag>>(
    `${basePath}/blood-collections`,
    { params }
  )
  return response.data
}
