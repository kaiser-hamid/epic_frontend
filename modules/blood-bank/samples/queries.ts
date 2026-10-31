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
  collectSamples,
  findSampleCollectionByInvoice,
  getSampleCollection,
  listPendingCollections,
  listSamples,
  printSampleLabels,
  type PendingCollectionListParams,
  type SampleListParams,
} from "@/modules/blood-bank/samples/api"
import type {
  CollectSubjectInput,
  SampleCollection,
} from "@/modules/blood-bank/samples/types"

export const sampleKeys = {
  all: ["blood-bank", "samples"] as const,
  lists: () => [...sampleKeys.all, "list"] as const,
  list: (params: SampleListParams) => [...sampleKeys.lists(), params] as const,
  pendingLists: () => [...sampleKeys.all, "pending"] as const,
  pendingList: (params: PendingCollectionListParams) =>
    [...sampleKeys.pendingLists(), params] as const,
  collections: () => [...sampleKeys.all, "collection"] as const,
  collection: (caseId: number | null) =>
    [...sampleKeys.collections(), caseId] as const,
}

/** The collection screen of a case; idle while no case is loaded. */
export function useSampleCollection(caseId: number | null) {
  return useQuery({
    queryKey: sampleKeys.collection(caseId),
    queryFn: caseId === null ? skipToken : () => getSampleCollection(caseId),
  })
}

/**
 * Invoice scan. An action rather than a query: each Enter asks the server again. The
 * result seeds the case's screen cache, so loading that case needs no second request.
 */
export function useFindSampleCollectionByInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: findSampleCollectionByInvoice,
    onSuccess: (view: SampleCollection) => {
      queryClient.setQueryData(sampleKeys.collection(view.case.id), view)
    },
  })
}

/**
 * The response is the whole refreshed screen, so it replaces the cache without a refetch.
 * On failure (someone else collected, donor deferred, case closed) the screen is refetched.
 */
export function useCollectSamples(caseId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (subjects: CollectSubjectInput[]) =>
      collectSamples(caseId, subjects),
    onSuccess: (view: SampleCollection) => {
      queryClient.setQueryData(sampleKeys.collection(caseId), view)
      queryClient.invalidateQueries({ queryKey: sampleKeys.pendingLists() })
      queryClient.invalidateQueries({ queryKey: sampleKeys.lists() })
      queryClient.invalidateQueries({ queryKey: caseKeys.detail(caseId) })
    },
    onError: () => {
      queryClient.invalidateQueries({
        queryKey: sampleKeys.collection(caseId),
      })
    },
  })
}

/**
 * Logs label prints. Each printed label's `label_print_count` goes up by one on the cached
 * screen, so the next print of it asks for a reprint reason without a refetch.
 */
export function usePrintSampleLabels() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: printSampleLabels,
    onSuccess: (labels, { caseId }) => {
      const printed = new Set(labels.map((label) => label.id))
      queryClient.setQueryData<SampleCollection>(
        sampleKeys.collection(caseId),
        (view) =>
          view && {
            ...view,
            subjects: view.subjects.map((subject) =>
              subject.sample && printed.has(subject.sample.id)
                ? {
                    ...subject,
                    sample: {
                      ...subject.sample,
                      label_print_count: subject.sample.label_print_count + 1,
                    },
                  }
                : subject
            ),
          }
      )
    },
  })
}

export function usePendingCollections(params: PendingCollectionListParams) {
  return useQuery({
    queryKey: sampleKeys.pendingList(params),
    queryFn: () => listPendingCollections(params),
    placeholderData: keepPreviousData,
  })
}

export function useSamples(params: SampleListParams) {
  return useQuery({
    queryKey: sampleKeys.list(params),
    queryFn: () => listSamples(params),
    placeholderData: keepPreviousData,
  })
}
