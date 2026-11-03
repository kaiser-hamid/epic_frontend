"use client"

import {
  keepPreviousData,
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import {
  bloodIssueLookup,
  findBloodIssue,
  getBloodIssue,
  issueBlood,
  listPendingBloodIssues,
  printCompatibilityReports,
  type PendingBloodIssueListParams,
} from "@/modules/blood-bank/blood-issue/api"
import { isBloodIssueReloadError } from "@/modules/blood-bank/blood-issue/error-messages"
import type {
  BloodIssue,
  IssueBloodInput,
  PrintCompatibilityReportsInput,
} from "@/modules/blood-bank/blood-issue/types"
import { caseKeys } from "@/modules/blood-bank/cases/queries"
import { donorExaminationKeys } from "@/modules/blood-bank/donor-examinations/queries"
import { unitKeys } from "@/modules/blood-bank/units/queries"

export const bloodIssueKeys = {
  all: ["blood-bank", "blood-issue"] as const,
  pendingLists: () => [...bloodIssueKeys.all, "pending"] as const,
  pendingList: (params: PendingBloodIssueListParams) =>
    [...bloodIssueKeys.pendingLists(), params] as const,
  screens: () => [...bloodIssueKeys.all, "screen"] as const,
  screen: (caseId: number | null) =>
    [...bloodIssueKeys.screens(), caseId] as const,
}

/** The issue screen of a case; idle while none is loaded. */
export function useBloodIssue(caseId: number | null) {
  return useQuery({
    queryKey: bloodIssueKeys.screen(caseId),
    queryFn: caseId === null ? skipToken : () => getBloodIssue(caseId),
  })
}

/**
 * Invoice or donor no scan. An action rather than a query: each Enter asks the server again.
 * The result seeds the case's screen, so loading it needs no second request.
 */
export function useFindBloodIssue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (value: string) => findBloodIssue(bloodIssueLookup(value)),
    onSuccess: (view: BloodIssue) => {
      queryClient.setQueryData(bloodIssueKeys.screen(view.case.id), view)
    },
  })
}

/**
 * "Issue Blood". The answer is the report PDF, not the screen, so the screen is refetched:
 * its units are now `issued` and the case may be closed. The case leaves the pending list once
 * nothing is reserved, the units list shows them issued, the donors' post-donation vitals are
 * recorded. When the screen was out of date (a 409, a unit issued or expired, the case closed)
 * it is refetched too.
 */
export function useIssueBlood(caseId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: IssueBloodInput) => issueBlood(caseId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: bloodIssueKeys.screen(caseId),
      })
      queryClient.invalidateQueries({
        queryKey: bloodIssueKeys.pendingLists(),
      })
      queryClient.invalidateQueries({ queryKey: unitKeys.lists() })
      queryClient.invalidateQueries({
        queryKey: unitKeys.casePreparations(caseId),
      })
      queryClient.invalidateQueries({
        queryKey: donorExaminationKeys.screen(caseId),
      })
      queryClient.invalidateQueries({ queryKey: caseKeys.detail(caseId) })
      queryClient.invalidateQueries({ queryKey: caseKeys.lists() })
    },
    onError: (error) => {
      if (isBloodIssueReloadError(error)) {
        queryClient.invalidateQueries({
          queryKey: bloodIssueKeys.screen(caseId),
        })
      }
    },
  })
}

/** Reprints reports; the screen is refetched so the print counts go up. */
export function usePrintCompatibilityReports(caseId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: PrintCompatibilityReportsInput) =>
      printCompatibilityReports(caseId, input),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: bloodIssueKeys.screen(caseId),
      })
    },
  })
}

export function usePendingBloodIssues(params: PendingBloodIssueListParams) {
  return useQuery({
    queryKey: bloodIssueKeys.pendingList(params),
    queryFn: () => listPendingBloodIssues(params),
    placeholderData: keepPreviousData,
  })
}
