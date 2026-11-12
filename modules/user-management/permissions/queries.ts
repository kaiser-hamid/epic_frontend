"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"

import {
  listUserAccess,
  type UserAccessListParams,
} from "@/modules/user-management/permissions/api"
import { accessKeys } from "@/modules/user-management/users/queries"

export const userAccessKeys = {
  all: accessKeys.userAccess,
  list: (params: UserAccessListParams) =>
    [...accessKeys.userAccess(), params] as const,
}

export function useUserAccessList(
  params: UserAccessListParams,
  enabled = true
) {
  return useQuery({
    queryKey: userAccessKeys.list(params),
    queryFn: () => listUserAccess(params),
    placeholderData: keepPreviousData,
    enabled,
  })
}
