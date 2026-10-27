"use client"

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import {
  cancelCase,
  createCase,
  getCase,
  listCases,
  updateCase,
  type CaseListParams,
} from "@/modules/blood-bank/cases/api"
import type { CaseUpdateValues } from "@/modules/blood-bank/cases/schemas"
import type { BloodBankCase } from "@/modules/blood-bank/cases/types"

export const caseKeys = {
  all: ["blood-bank", "cases"] as const,
  lists: () => [...caseKeys.all, "list"] as const,
  list: (params: CaseListParams) => [...caseKeys.lists(), params] as const,
  details: () => [...caseKeys.all, "detail"] as const,
  detail: (id: number) => [...caseKeys.details(), id] as const,
}

export function useCases(params: CaseListParams) {
  return useQuery({
    queryKey: caseKeys.list(params),
    queryFn: () => listCases(params),
    placeholderData: keepPreviousData,
  })
}

export function useCase(id: number) {
  return useQuery({
    queryKey: caseKeys.detail(id),
    queryFn: () => getCase(id),
  })
}

/**
 * After any write, refetch lists and the detail. Invalidate rather than
 * `setQueryData`: write responses may omit the includes the detail view needs.
 */
function useSyncCase() {
  const queryClient = useQueryClient()

  return (record: BloodBankCase) => {
    queryClient.invalidateQueries({ queryKey: caseKeys.lists() })
    queryClient.invalidateQueries({ queryKey: caseKeys.detail(record.id) })
  }
}

export function useCreateCase() {
  const syncCase = useSyncCase()
  return useMutation({ mutationFn: createCase, onSuccess: syncCase })
}

export function useUpdateCase(id: number) {
  const syncCase = useSyncCase()
  return useMutation({
    mutationFn: (changes: Partial<CaseUpdateValues>) => updateCase(id, changes),
    onSuccess: syncCase,
  })
}

export function useCancelCase(id: number) {
  const syncCase = useSyncCase()
  return useMutation({
    mutationFn: (reason: string) => cancelCase(id, reason),
    onSuccess: syncCase,
  })
}
