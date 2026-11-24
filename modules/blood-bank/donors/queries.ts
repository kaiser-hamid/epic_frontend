"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"

import {
  findDonorsByPhone,
  getDonor,
  listDonors,
  searchDonors,
  type DonorListParams,
} from "@/modules/blood-bank/donors/api"

export const donorKeys = {
  all: ["blood-bank", "donors"] as const,
  lists: () => [...donorKeys.all, "list"] as const,
  list: (params: DonorListParams) => [...donorKeys.lists(), params] as const,
  details: () => [...donorKeys.all, "detail"] as const,
  detail: (id: number) => [...donorKeys.details(), id] as const,
  searches: () => [...donorKeys.all, "search"] as const,
  search: (term: string) => [...donorKeys.searches(), term] as const,
  byPhone: (phone: string) => [...donorKeys.all, "by-phone", phone] as const,
}

export function useDonors(params: DonorListParams) {
  return useQuery({
    queryKey: donorKeys.list(params),
    queryFn: () => listDonors(params),
    placeholderData: keepPreviousData,
  })
}

export function useDonor(id: number) {
  return useQuery({
    queryKey: donorKeys.detail(id),
    queryFn: () => getDonor(id),
  })
}

export function useDonorSearch(term: string) {
  const trimmed = term.trim()
  return useQuery({
    queryKey: donorKeys.search(trimmed),
    queryFn: () => searchDonors(trimmed),
    enabled: trimmed.length >= 2,
    placeholderData: keepPreviousData,
  })
}

/**
 * Donors registered with a phone number (exact match). `phone` is the number submitted with
 * Enter; "" runs no request. Cached for a minute per number.
 */
export function useDonorPhoneLookup(phone: string) {
  return useQuery({
    queryKey: donorKeys.byPhone(phone),
    queryFn: () => findDonorsByPhone(phone),
    enabled: phone !== "",
    staleTime: 60_000,
  })
}
