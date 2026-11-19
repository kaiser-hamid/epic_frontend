"use client"

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query"

import {
  listUnits,
  printUnitLabels,
  type UnitListParams,
} from "@/modules/blood-bank/units/api"

export const unitKeys = {
  all: ["blood-bank", "units"] as const,
  lists: () => [...unitKeys.all, "list"] as const,
  list: (params: UnitListParams) => [...unitKeys.lists(), params] as const,
}

/** Logs unit label prints (reprints from the Units tab). */
export function usePrintUnitLabels() {
  return useMutation({ mutationFn: printUnitLabels })
}

export function useUnits(params: UnitListParams) {
  return useQuery({
    queryKey: unitKeys.list(params),
    queryFn: () => listUnits(params),
    placeholderData: keepPreviousData,
  })
}
