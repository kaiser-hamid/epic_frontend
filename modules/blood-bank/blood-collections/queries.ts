"use client"

import {
  keepPreviousData,
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { isApiError } from "@/lib/api-error"
import {
  bloodCollectionLookup,
  collectBlood,
  findBloodCollection,
  getBloodCollection,
  listBags,
  listPendingBloodCollections,
  printBagLabels,
  type BagListParams,
  type CollectBloodRequest,
  type PendingBloodCollectionListParams,
} from "@/modules/blood-bank/blood-collections/api"
import { bloodCollectionReloadCodes } from "@/modules/blood-bank/blood-collections/error-messages"
import {
  focusView,
  scanFocus,
} from "@/modules/blood-bank/blood-collections/focus"
import type { BloodCollection } from "@/modules/blood-bank/blood-collections/types"
import { caseDonorKeys } from "@/modules/blood-bank/case-donors/queries"
import { caseKeys } from "@/modules/blood-bank/cases/queries"
import { donorExaminationKeys } from "@/modules/blood-bank/donor-examinations/queries"
import { donorSerologyKeys } from "@/modules/blood-bank/donor-serology/queries"
import { donorKeys } from "@/modules/blood-bank/donors/queries"
import { sampleKeys } from "@/modules/blood-bank/samples/queries"

export const bloodCollectionKeys = {
  all: ["blood-bank", "blood-collections"] as const,
  lists: () => [...bloodCollectionKeys.all, "list"] as const,
  list: (params: BagListParams) =>
    [...bloodCollectionKeys.lists(), params] as const,
  pendingLists: () => [...bloodCollectionKeys.all, "pending"] as const,
  pendingList: (params: PendingBloodCollectionListParams) =>
    [...bloodCollectionKeys.pendingLists(), params] as const,
  screens: () => [...bloodCollectionKeys.all, "screen"] as const,
  /** Every screen of a case: all donors, or one donor after a donor no scan. */
  caseScreens: (caseId: number | null) =>
    [...bloodCollectionKeys.screens(), caseId] as const,
  screen: (caseId: number | null, focusDonorId: number | null) =>
    [...bloodCollectionKeys.caseScreens(caseId), focusDonorId] as const,
}

/**
 * The collection screen of a case; idle while no case is loaded. With `focusDonorId` (after
 * a donor no scan) it shows only that donor, whatever the cached response holds.
 */
export function useBloodCollection(
  caseId: number | null,
  focusDonorId: number | null
) {
  return useQuery({
    queryKey: bloodCollectionKeys.screen(caseId, focusDonorId),
    queryFn: caseId === null ? skipToken : () => getBloodCollection(caseId),
    select: (view: BloodCollection) => focusView(view, focusDonorId),
  })
}

/**
 * Invoice or donor no scan. An action rather than a query: each Enter asks the server again.
 * The result seeds the screen it opens (all donors, or the scanned donor), so loading it
 * needs no second request.
 */
export function useFindBloodCollection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (value: string) =>
      findBloodCollection(bloodCollectionLookup(value)),
    onSuccess: (view: BloodCollection, value: string) => {
      const isDonorScan = "donor_no" in bloodCollectionLookup(value)
      const focus = scanFocus(value, view)
      // A donor scan holds one donor only; it must never pass for the whole case.
      if (!isDonorScan || focus !== null) {
        queryClient.setQueryData(
          bloodCollectionKeys.screen(view.case.id, focus),
          view
        )
      }
    },
  })
}

/**
 * The response is the whole refreshed screen (every donor), so it replaces each cached screen
 * of the case without a refetch; a focused screen still shows only its donor. A bag marks the
 * donor `collected` and locks their serology, so the other screens of the case that show the
 * donor's status are refreshed too. When the screen was out of date (already collected, donor
 * deferred, case closed) it is refetched.
 */
export function useCollectBlood(caseId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: CollectBloodRequest) => collectBlood(caseId, request),
    onSuccess: (view: BloodCollection) => {
      queryClient.setQueriesData<BloodCollection>(
        { queryKey: bloodCollectionKeys.caseScreens(caseId) },
        view
      )
      queryClient.setQueryData(bloodCollectionKeys.screen(caseId, null), view)
      queryClient.invalidateQueries({
        queryKey: bloodCollectionKeys.pendingLists(),
      })
      queryClient.invalidateQueries({ queryKey: bloodCollectionKeys.lists() })
      queryClient.invalidateQueries({
        queryKey: donorSerologyKeys.caseScreens(caseId),
      })
      queryClient.invalidateQueries({
        queryKey: donorExaminationKeys.screen(caseId),
      })
      queryClient.invalidateQueries({
        queryKey: sampleKeys.collection(caseId),
      })
      queryClient.invalidateQueries({ queryKey: caseDonorKeys.all })
      queryClient.invalidateQueries({ queryKey: caseKeys.detail(caseId) })
      queryClient.invalidateQueries({ queryKey: donorKeys.all })
    },
    onError: (error) => {
      if (
        isApiError(error) &&
        bloodCollectionReloadCodes.includes(error.code)
      ) {
        queryClient.invalidateQueries({
          queryKey: bloodCollectionKeys.caseScreens(caseId),
        })
      }
    },
  })
}

/**
 * Logs bag label prints. Each printed label's `label_print_count` goes up by one on the
 * cached screens of the case, so the next print of it asks for a reprint reason without a
 * refetch.
 */
export function usePrintBagLabels() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: printBagLabels,
    onSuccess: (labels, { caseId }) => {
      const printed = new Set(labels.map((label) => label.id))
      queryClient.setQueriesData<BloodCollection>(
        { queryKey: bloodCollectionKeys.caseScreens(caseId) },
        (view) =>
          view && {
            ...view,
            donors: view.donors.map((donor) =>
              donor.collection && printed.has(donor.collection.id)
                ? {
                    ...donor,
                    collection: {
                      ...donor.collection,
                      label_print_count: donor.collection.label_print_count + 1,
                    },
                  }
                : donor
            ),
          }
      )
    },
  })
}

export function usePendingBloodCollections(
  params: PendingBloodCollectionListParams
) {
  return useQuery({
    queryKey: bloodCollectionKeys.pendingList(params),
    queryFn: () => listPendingBloodCollections(params),
    placeholderData: keepPreviousData,
  })
}

export function useBags(params: BagListParams) {
  return useQuery({
    queryKey: bloodCollectionKeys.list(params),
    queryFn: () => listBags(params),
    placeholderData: keepPreviousData,
  })
}
