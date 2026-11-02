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
import {
  findComponentPreparation,
  getComponentPreparation,
  listPendingPreparations,
  listUnits,
  prepareUnits,
  printUnitLabels,
  type PendingPreparationListParams,
  type PreparationRef,
  type UnitListParams,
} from "@/modules/blood-bank/units/api"
import { unitReloadCodes } from "@/modules/blood-bank/units/error-messages"
import type {
  ComponentPreparation,
  PrepareUnitsInput,
} from "@/modules/blood-bank/units/types"

export const unitKeys = {
  all: ["blood-bank", "units"] as const,
  lists: () => [...unitKeys.all, "list"] as const,
  list: (params: UnitListParams) => [...unitKeys.lists(), params] as const,
  pendingLists: () => [...unitKeys.all, "pending"] as const,
  pendingList: (params: PendingPreparationListParams) =>
    [...unitKeys.pendingLists(), params] as const,
  preparations: () => [...unitKeys.all, "preparation"] as const,
  /** Every bag screen of a case (a label print can touch any of them). */
  casePreparations: (caseId: number | null) =>
    [...unitKeys.preparations(), caseId] as const,
  preparation: (ref: PreparationRef | null) =>
    [
      ...unitKeys.casePreparations(ref?.caseId ?? null),
      ref?.bagId ?? null,
    ] as const,
}

/** The preparation screen of a bag; idle while none is loaded. */
export function useComponentPreparation(ref: PreparationRef | null) {
  return useQuery({
    queryKey: unitKeys.preparation(ref),
    queryFn: ref === null ? skipToken : () => getComponentPreparation(ref),
  })
}

/**
 * Bag label scan. An action rather than a query: each Enter asks the server again. The
 * result seeds the bag's screen, so loading it needs no second request.
 */
export function useFindComponentPreparation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: findComponentPreparation,
    onSuccess: (view: ComponentPreparation) => {
      queryClient.setQueryData(
        unitKeys.preparation({ caseId: view.case.id, bagId: view.bag.id }),
        view
      )
    },
  })
}

/**
 * The response is the whole refreshed screen, so it replaces the cache without a refetch; the
 * bag leaves the pending list and its units join the stock list. When the screen was out of
 * date (already prepared, bag cancelled, case closed, held units changed) it is refetched.
 */
export function usePrepareUnits(ref: PreparationRef) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: PrepareUnitsInput) => prepareUnits(ref, input),
    onSuccess: (view: ComponentPreparation) => {
      queryClient.setQueryData(unitKeys.preparation(ref), view)
      queryClient.invalidateQueries({ queryKey: unitKeys.pendingLists() })
      queryClient.invalidateQueries({ queryKey: unitKeys.lists() })
      // Other bags of the case show the case's held counts.
      queryClient.invalidateQueries({
        queryKey: unitKeys.casePreparations(ref.caseId),
        predicate: (query) => query.queryKey[4] !== ref.bagId,
      })
      queryClient.invalidateQueries({ queryKey: caseKeys.detail(ref.caseId) })
    },
    onError: (error) => {
      if (isApiError(error) && unitReloadCodes.includes(error.code)) {
        queryClient.invalidateQueries({ queryKey: unitKeys.preparation(ref) })
      }
    },
  })
}

/**
 * Logs component label prints. Each printed label's `label_print_count` goes up by one on the
 * cached screens of the case, so the next print of it asks for a reprint reason without a
 * refetch.
 */
export function usePrintUnitLabels() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: printUnitLabels,
    onSuccess: (labels, { caseId }) => {
      const printed = new Set(labels.map((label) => label.id))
      queryClient.setQueriesData<ComponentPreparation>(
        { queryKey: unitKeys.casePreparations(caseId) },
        (view) =>
          view && {
            ...view,
            units: view.units.map((unit) =>
              printed.has(unit.id)
                ? { ...unit, label_print_count: unit.label_print_count + 1 }
                : unit
            ),
          }
      )
    },
  })
}

export function usePendingPreparations(params: PendingPreparationListParams) {
  return useQuery({
    queryKey: unitKeys.pendingList(params),
    queryFn: () => listPendingPreparations(params),
    placeholderData: keepPreviousData,
  })
}

export function useUnits(params: UnitListParams) {
  return useQuery({
    queryKey: unitKeys.list(params),
    queryFn: () => listUnits(params),
    placeholderData: keepPreviousData,
  })
}
