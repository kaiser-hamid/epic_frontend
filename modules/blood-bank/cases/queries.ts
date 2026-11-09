"use client"

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import {
  getCase,
  listCases,
  updateCase,
  type CaseListParams,
} from "@/modules/blood-bank/cases/api"
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
 * The response is the case detail, so it replaces the cached one. Work screens that show
 * "Care of" read the case afresh, so every case query is refetched.
 */
export function useUpdateCase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateCase,
    onSuccess: (record: BloodBankCase) => {
      queryClient.setQueryData(caseKeys.detail(record.id), record)
      queryClient.invalidateQueries({ queryKey: caseKeys.lists() })
    },
  })
}
