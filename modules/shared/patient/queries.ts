"use client"

import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useCallback } from "react"

import {
  findPatientsByPhone,
  getPatient,
  searchPatients,
} from "@/modules/shared/patient/api"

export const patientKeys = {
  all: ["shared", "patients"] as const,
  searches: () => [...patientKeys.all, "search"] as const,
  search: (term: string) => [...patientKeys.searches(), term] as const,
  byPhone: (phone: string) => [...patientKeys.all, "by-phone", phone] as const,
  details: () => [...patientKeys.all, "detail"] as const,
  detail: (id: number) => [...patientKeys.details(), id] as const,
}

export function usePatientSearch(term: string) {
  const trimmed = term.trim()
  return useQuery({
    queryKey: patientKeys.search(trimmed),
    queryFn: () => searchPatients(trimmed),
    enabled: trimmed.length >= 2,
    placeholderData: keepPreviousData,
  })
}

export function usePatient(id: number | null | undefined) {
  return useQuery({
    queryKey: patientKeys.detail(id ?? 0),
    queryFn: () => getPatient(id as number),
    enabled: typeof id === "number" && id > 0,
  })
}

/**
 * For "type the number, then fill the form" fields: returns a function to call on blur or
 * Enter. Cached for a minute, so committing the same number again does not refetch.
 */
export function useFindPatientsByPhone() {
  const queryClient = useQueryClient()
  return useCallback(
    (phone: string) =>
      queryClient.fetchQuery({
        queryKey: patientKeys.byPhone(phone),
        queryFn: () => findPatientsByPhone(phone),
        staleTime: 60_000,
      }),
    [queryClient]
  )
}
