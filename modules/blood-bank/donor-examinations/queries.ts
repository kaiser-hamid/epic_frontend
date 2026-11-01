"use client"

import {
  keepPreviousData,
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { caseKeys } from "@/modules/blood-bank/cases/queries"
import {
  findDonorExaminationByInvoice,
  getDonorExamination,
  listPendingExaminations,
  recordPhysicalExamination,
  type PendingExaminationListParams,
} from "@/modules/blood-bank/donor-examinations/api"
import type { DonorExamination } from "@/modules/blood-bank/donor-examinations/types"
import { sampleKeys } from "@/modules/blood-bank/samples/queries"

export const donorExaminationKeys = {
  all: ["blood-bank", "donor-examinations"] as const,
  pendingLists: () => [...donorExaminationKeys.all, "pending"] as const,
  pendingList: (params: PendingExaminationListParams) =>
    [...donorExaminationKeys.pendingLists(), params] as const,
  screens: () => [...donorExaminationKeys.all, "screen"] as const,
  screen: (caseId: number | null) =>
    [...donorExaminationKeys.screens(), caseId] as const,
}

/** The examination screen of a case; idle while no case is loaded. */
export function useDonorExamination(caseId: number | null) {
  return useQuery({
    queryKey: donorExaminationKeys.screen(caseId),
    queryFn: caseId === null ? skipToken : () => getDonorExamination(caseId),
  })
}

/**
 * Invoice scan. An action rather than a query: each Enter asks the server again. The
 * result seeds the case's screen cache, so loading that case needs no second request.
 */
export function useFindDonorExaminationByInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: findDonorExaminationByInvoice,
    onSuccess: (view: DonorExamination) => {
      queryClient.setQueryData(donorExaminationKeys.screen(view.case.id), view)
    },
  })
}

/**
 * The response is the whole refreshed screen, so it replaces the cache without a refetch.
 * A decision changes who can give a sample, so the Sample Collection screen and both pending
 * lists are refreshed too. On failure (locked, case closed) the screen is refetched.
 */
export function useRecordPhysicalExamination(caseId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: recordPhysicalExamination,
    onSuccess: (view: DonorExamination) => {
      queryClient.setQueryData(donorExaminationKeys.screen(caseId), view)
      queryClient.invalidateQueries({
        queryKey: donorExaminationKeys.pendingLists(),
      })
      queryClient.invalidateQueries({
        queryKey: sampleKeys.collection(caseId),
      })
      queryClient.invalidateQueries({ queryKey: sampleKeys.pendingLists() })
      queryClient.invalidateQueries({ queryKey: caseKeys.detail(caseId) })
    },
    onError: () => {
      queryClient.invalidateQueries({
        queryKey: donorExaminationKeys.screen(caseId),
      })
    },
  })
}

export function usePendingExaminations(params: PendingExaminationListParams) {
  return useQuery({
    queryKey: donorExaminationKeys.pendingList(params),
    queryFn: () => listPendingExaminations(params),
    placeholderData: keepPreviousData,
  })
}
