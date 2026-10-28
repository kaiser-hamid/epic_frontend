"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { searchDonors } from "@/modules/blood-bank/donors/api"

export const donorKeys = {
  all: ["blood-bank", "donors"] as const,
  searches: () => [...donorKeys.all, "search"] as const,
  search: (term: string) => [...donorKeys.searches(), term] as const,
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
