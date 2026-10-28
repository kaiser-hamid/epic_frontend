"use client"

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import {
  createCase,
  getCase,
  listCases,
  type CaseListParams,
} from "@/modules/blood-bank/cases/api"
import type { BloodBankCase } from "@/modules/blood-bank/cases/types"
import { donorKeys } from "@/modules/blood-bank/donors/queries"
import { patientKeys } from "@/modules/shared/patient/queries"

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
 * The create response already has the detail shape, so it seeds the detail cache.
 * Registration can also add a patient and donors, so their searches are refetched.
 */
export function useCreateCase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createCase,
    onSuccess: (record: BloodBankCase) => {
      queryClient.setQueryData(caseKeys.detail(record.id), record)
      queryClient.invalidateQueries({ queryKey: caseKeys.lists() })
      queryClient.invalidateQueries({ queryKey: patientKeys.all })
      queryClient.invalidateQueries({ queryKey: donorKeys.all })
    },
  })
}
