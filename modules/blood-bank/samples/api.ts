import { apiClient } from "@/lib/api-client"
import type {
  ListParams,
  PaginatedResponse,
  ResourceResponse,
} from "@/lib/api-types"
import type { BloodBankCase } from "@/modules/blood-bank/cases/types"
import type {
  CollectSubjectInput,
  PendingCollectionFilters,
  SampleCollection,
  SampleFilters,
  SampleLabel,
  SampleListItem,
} from "@/modules/blood-bank/samples/types"

const basePath = "/api/blood-bank"

export type SampleListParams = Omit<ListParams, "filter" | "include"> & {
  filter?: SampleFilters
}

export type PendingCollectionListParams = Omit<
  ListParams,
  "filter" | "include"
> & {
  filter?: PendingCollectionFilters
}

export type PrintSampleLabelsInput = {
  caseId: number
  sampleIds: number[]
  /** Required when any of the labels was printed before. */
  reprintReason?: string
}

/**
 * The collection screen for a scanned invoice: the case bill or a replacement donor's bill.
 * `404 CASE_NOT_FOUND` when no case of the session branch matches.
 */
export async function findSampleCollectionByInvoice(
  invoiceNo: string
): Promise<SampleCollection> {
  const response = await apiClient.get<ResourceResponse<SampleCollection>>(
    `${basePath}/sample-collection`,
    { params: { invoice_no: invoiceNo } }
  )
  return response.data.data
}

/** The collection screen for a case (from the Pending tab). */
export async function getSampleCollection(
  caseId: number
): Promise<SampleCollection> {
  const response = await apiClient.get<ResourceResponse<SampleCollection>>(
    `${basePath}/cases/${caseId}/sample-collection`
  )
  return response.data.data
}

/**
 * Draws a sample from each ticked row, all or none. `collected_at` is left to the server
 * (now). Returns the refreshed screen with `collected_sample_ids` set.
 */
export async function collectSamples(
  caseId: number,
  subjects: CollectSubjectInput[]
): Promise<SampleCollection> {
  const response = await apiClient.post<ResourceResponse<SampleCollection>>(
    `${basePath}/cases/${caseId}/samples`,
    { subjects }
  )
  return response.data.data
}

/**
 * Logs the print of one or more labels of a case (all or none) and returns what goes on
 * each. `422 REPRINT_REASON_REQUIRED` when one was printed before and no reason is given.
 */
export async function printSampleLabels({
  caseId,
  sampleIds,
  reprintReason,
}: PrintSampleLabelsInput): Promise<SampleLabel[]> {
  const response = await apiClient.post<ResourceResponse<SampleLabel[]>>(
    `${basePath}/cases/${caseId}/sample-labels`,
    { sample_ids: sampleIds, reprint_reason: reprintReason?.trim() || null }
  )
  return response.data.data
}

/** Open cases of the branch still waiting for a sample, oldest first by default. */
export async function listPendingCollections(
  params: PendingCollectionListParams
): Promise<PaginatedResponse<BloodBankCase>> {
  const response = await apiClient.get<PaginatedResponse<BloodBankCase>>(
    `${basePath}/sample-collection/pending`,
    { params }
  )
  return response.data
}

/** Samples of the branch's cases, newest first by default. */
export async function listSamples(
  params: SampleListParams
): Promise<PaginatedResponse<SampleListItem>> {
  const response = await apiClient.get<PaginatedResponse<SampleListItem>>(
    `${basePath}/samples`,
    { params }
  )
  return response.data
}
