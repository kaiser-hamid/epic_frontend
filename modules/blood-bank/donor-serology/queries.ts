"use client"

import {
  keepPreviousData,
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { isApiError } from "@/lib/api-error"
import { caseKeys } from "@/modules/blood-bank/cases/queries"
import { donorExaminationKeys } from "@/modules/blood-bank/donor-examinations/queries"
import {
  findDonorSerology,
  getDonorSerology,
  listPendingSerology,
  recordDonorSerology,
  serologyLookup,
  type PendingSerologyListParams,
} from "@/modules/blood-bank/donor-serology/api"
import { serologyReloadCodes } from "@/modules/blood-bank/donor-serology/error-messages"
import { focusView, scanFocus } from "@/modules/blood-bank/donor-serology/focus"
import type { DonorSerology } from "@/modules/blood-bank/donor-serology/types"
import { sampleKeys } from "@/modules/blood-bank/samples/queries"

export const donorSerologyKeys = {
  all: ["blood-bank", "donor-serology"] as const,
  pendingLists: () => [...donorSerologyKeys.all, "pending"] as const,
  pendingList: (params: PendingSerologyListParams) =>
    [...donorSerologyKeys.pendingLists(), params] as const,
  screens: () => [...donorSerologyKeys.all, "screen"] as const,
  /** Every screen of a case: all donors, or one donor after a sample scan. */
  caseScreens: (caseId: number | null) =>
    [...donorSerologyKeys.screens(), caseId] as const,
  screen: (caseId: number | null, focusDonorId: number | null) =>
    [...donorSerologyKeys.caseScreens(caseId), focusDonorId] as const,
}

/**
 * The serology screen of a case; idle while no case is loaded. With `focusDonorId` (after a
 * sample scan) it shows only that donor, whatever the cached response holds.
 */
export function useDonorSerology(
  caseId: number | null,
  focusDonorId: number | null
) {
  return useQuery({
    queryKey: donorSerologyKeys.screen(caseId, focusDonorId),
    queryFn: caseId === null ? skipToken : () => getDonorSerology(caseId),
    select: (view: DonorSerology) => focusView(view, focusDonorId),
  })
}

/**
 * Invoice or sample scan. An action rather than a query: each Enter asks the server again.
 * The result seeds the screen it opens (all donors, or the sample's donor), so loading it
 * needs no second request.
 */
export function useFindDonorSerology() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (value: string) => findDonorSerology(serologyLookup(value)),
    onSuccess: (view: DonorSerology, value: string) => {
      const isSampleScan = "sample_no" in serologyLookup(value)
      const focus = scanFocus(value, view)
      // A sample scan holds one donor only; it must never pass for the whole case.
      if (!isSampleScan || focus !== null) {
        queryClient.setQueryData(
          donorSerologyKeys.screen(view.case.id, focus),
          view
        )
      }
    },
  })
}

/**
 * The response is the whole refreshed screen (every donor), so it replaces each cached
 * screen of the case without a refetch; a focused screen still shows only its donor. A
 * decision changes who can be bled and locks the physical exam, so the Donor Examination and
 * Sample Collection screens of the case and the pending list are refreshed too. When the
 * screen was out of date (donor locked, case closed) it is refetched.
 */
export function useRecordDonorSerology(caseId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: recordDonorSerology,
    onSuccess: (view: DonorSerology) => {
      queryClient.setQueriesData<DonorSerology>(
        { queryKey: donorSerologyKeys.caseScreens(caseId) },
        view
      )
      queryClient.setQueryData(donorSerologyKeys.screen(caseId, null), view)
      queryClient.invalidateQueries({
        queryKey: donorSerologyKeys.pendingLists(),
      })
      queryClient.invalidateQueries({
        queryKey: donorExaminationKeys.screen(caseId),
      })
      queryClient.invalidateQueries({
        queryKey: sampleKeys.collection(caseId),
      })
      queryClient.invalidateQueries({ queryKey: sampleKeys.lists() })
      queryClient.invalidateQueries({ queryKey: caseKeys.detail(caseId) })
    },
    onError: (error) => {
      if (isApiError(error) && serologyReloadCodes.includes(error.code)) {
        queryClient.invalidateQueries({
          queryKey: donorSerologyKeys.caseScreens(caseId),
        })
      }
    },
  })
}

export function usePendingSerology(params: PendingSerologyListParams) {
  return useQuery({
    queryKey: donorSerologyKeys.pendingList(params),
    queryFn: () => listPendingSerology(params),
    placeholderData: keepPreviousData,
  })
}
