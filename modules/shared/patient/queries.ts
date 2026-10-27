"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { getPatient, searchPatients } from "@/modules/shared/patient/api"

export const patientKeys = {
  all: ["shared", "patients"] as const,
  searches: () => [...patientKeys.all, "search"] as const,
  search: (term: string) => [...patientKeys.searches(), term] as const,
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
