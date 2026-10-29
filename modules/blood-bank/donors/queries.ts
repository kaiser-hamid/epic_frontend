"use client"

import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useCallback } from "react"

import {
  findDonorsByPhone,
  searchDonors,
} from "@/modules/blood-bank/donors/api"

export const donorKeys = {
  all: ["blood-bank", "donors"] as const,
  searches: () => [...donorKeys.all, "search"] as const,
  search: (term: string) => [...donorKeys.searches(), term] as const,
  byPhone: (phone: string) => [...donorKeys.all, "by-phone", phone] as const,
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

/** For the donor's phone field: returns a function to call on blur or Enter. Cached for a minute per number. */
export function useFindDonorsByPhone() {
  const queryClient = useQueryClient()
  return useCallback(
    (phone: string) =>
      queryClient.fetchQuery({
        queryKey: donorKeys.byPhone(phone),
        queryFn: () => findDonorsByPhone(phone),
        staleTime: 60_000,
      }),
    [queryClient]
  )
}
