"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"

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
 * Patients registered with a phone number (exact match; a family may share one). `phone` is
 * the number submitted with Enter; "" runs no request. Cached for a minute per number.
 */
export function usePatientPhoneLookup(phone: string) {
  return useQuery({
    queryKey: patientKeys.byPhone(phone),
    queryFn: () => findPatientsByPhone(phone),
    enabled: phone !== "",
    staleTime: 60_000,
  })
}
