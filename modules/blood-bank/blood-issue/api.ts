import type { AxiosResponse } from "axios"

import { apiClient } from "@/lib/api-client"
import type {
  ListParams,
  PaginatedResponse,
  ResourceResponse,
} from "@/lib/api-types"
import type {
  BloodIssue,
  BloodIssueLookup,
  IssueBloodInput,
  PdfFile,
  PendingBloodIssueFilters,
  PrintCompatibilityReportsInput,
} from "@/modules/blood-bank/blood-issue/types"
import type { BloodBankCase } from "@/modules/blood-bank/cases/types"

const basePath = "/api/blood-bank"

export type PendingBloodIssueListParams = Omit<
  ListParams,
  "filter" | "include"
> & {
  filter?: PendingBloodIssueFilters
}

/**
 * A scanned value is a donor no when it starts with "D" (the donor card), otherwise an
 * invoice no (the case bill or an added donor's bill).
 */
export function bloodIssueLookup(value: string): BloodIssueLookup {
  const trimmed = value.trim()
  return /^d/i.test(trimmed) ? { donor_no: trimmed } : { invoice_no: trimmed }
}

/**
 * The file name in a `Content-Disposition` header (`inline; filename="CTR-BB-0001.pdf"`), or
 * `fallback` when there is none.
 */
export function filenameFromDisposition(
  header: unknown,
  fallback: string
): string {
  if (typeof header !== "string") {
    return fallback
  }
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header)
  const name = match?.[1]?.trim()
  if (!name) {
    return fallback
  }
  try {
    return decodeURIComponent(name)
  } catch {
    return name
  }
}

function toPdfFile(response: AxiosResponse<Blob>, fallback: string): PdfFile {
  return {
    blob: response.data,
    filename: filenameFromDisposition(
      response.headers["content-disposition"],
      fallback
    ),
  }
}

/**
 * The issue screen for a scanned invoice or donor no (a donor no opens the donor's latest
 * case, closed ones included). `404 CASE_NOT_FOUND` when none matches in the session branch.
 */
export async function findBloodIssue(
  lookup: BloodIssueLookup
): Promise<BloodIssue> {
  const response = await apiClient.get<ResourceResponse<BloodIssue>>(
    `${basePath}/blood-issue`,
    { params: lookup }
  )
  return response.data.data
}

/** The issue screen of a case (from the Pending tab or the URL). */
export async function getBloodIssue(caseId: number): Promise<BloodIssue> {
  const response = await apiClient.get<ResourceResponse<BloodIssue>>(
    `${basePath}/cases/${caseId}/blood-issue`
  )
  return response.data.data
}

/**
 * "Issue Blood": records the patient blood group, post-donation vitals and one crossmatch per
 * unit, and issues the units, all or nothing. Success is `201` with the Compatibility Test
 * Report PDF (one page per unit) as the body; errors are the usual JSON, read from the Blob by
 * the API client.
 */
export async function issueBlood(
  caseId: number,
  input: IssueBloodInput
): Promise<PdfFile> {
  const response = await apiClient.post<Blob>(
    `${basePath}/cases/${caseId}/blood-issue`,
    input,
    { responseType: "blob" }
  )
  return toPdfFile(response, `CTR-${caseId}.pdf`)
}

/**
 * Prints the Compatibility Test Report of units of the case again (`200` PDF, marked
 * "REPRINT"). `422 REPRINT_REASON_REQUIRED` when one was printed before and no reason is given.
 */
export async function printCompatibilityReports(
  caseId: number,
  input: PrintCompatibilityReportsInput
): Promise<PdfFile> {
  const response = await apiClient.post<Blob>(
    `${basePath}/cases/${caseId}/compatibility-reports`,
    {
      unit_ids: input.unit_ids,
      reprint_reason: input.reprint_reason?.trim() || null,
    },
    { responseType: "blob" }
  )
  return toPdfFile(response, `CTR-${caseId}.pdf`)
}

/** Open cases with a unit reserved for the patient, oldest first by default. */
export async function listPendingBloodIssues(
  params: PendingBloodIssueListParams
): Promise<PaginatedResponse<BloodBankCase>> {
  const response = await apiClient.get<PaginatedResponse<BloodBankCase>>(
    `${basePath}/blood-issue/pending`,
    { params }
  )
  return response.data
}
