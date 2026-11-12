"use client"

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query"

import { authKeys } from "@/modules/shared/auth/queries"
import {
  activateUser,
  createUser,
  deactivateUser,
  getUser,
  listBranchOptions,
  listPermissionCatalog,
  listRoleTemplates,
  listUserBranchPermissions,
  listUsers,
  resetUserPassword,
  syncUserBranchPermissions,
  updateUser,
  type UserListParams,
} from "@/modules/user-management/users/api"
import type {
  BranchPermissions,
  User,
} from "@/modules/user-management/users/types"

export const userKeys = {
  all: ["access", "users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  list: (params: UserListParams) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, "detail"] as const,
  detail: (id: number) => [...userKeys.details(), id] as const,
  branchPermissions: (id: number) =>
    [...userKeys.all, "branch-permissions", id] as const,
}

export const accessKeys = {
  permissions: () => ["access", "permissions"] as const,
  roles: () => ["access", "roles"] as const,
  branchOptions: () => ["access", "branch-options"] as const,
  /** The Permissions screen's user list (`/api/access/user-access`). */
  userAccess: () => ["access", "user-access"] as const,
}

export function useUsers(params: UserListParams) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => listUsers(params),
    placeholderData: keepPreviousData,
  })
}

export function useUser(id: number) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => getUser(id),
  })
}

/** The response is the account itself: it replaces the cached detail, and every list is refetched. */
function storeUser(queryClient: QueryClient, user: User) {
  queryClient.setQueryData(userKeys.detail(user.id), user)
  queryClient.invalidateQueries({ queryKey: userKeys.lists() })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createUser,
    onSuccess: (user: User) => storeUser(queryClient, user),
  })
}

/** Admins may edit their own profile, so the session's name is refreshed too. */
export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateUser,
    onSuccess: (user: User) => {
      storeUser(queryClient, user)
      queryClient.invalidateQueries({ queryKey: authKeys.me() })
    },
  })
}

export function useActivateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: activateUser,
    onSuccess: (user: User) => storeUser(queryClient, user),
  })
}

export function useDeactivateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deactivateUser,
    onSuccess: (user: User) => storeUser(queryClient, user),
  })
}

/** A reset clears any lock and forces a password change, so the account is refetched. */
export function useResetUserPassword() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: resetUserPassword,
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
    },
  })
}

export function useUserBranchPermissions(id: number, enabled = true) {
  return useQuery({
    queryKey: userKeys.branchPermissions(id),
    queryFn: () => listUserBranchPermissions(id),
    enabled,
  })
}

/** Puts the saved branch into the user's cached grants (so the editor shows it at once), dropping it when emptied. */
function storeBranchPermissions(
  current: BranchPermissions[] | undefined,
  saved: BranchPermissions
): BranchPermissions[] | undefined {
  if (!current) {
    return current
  }
  const others = current.filter((grant) => grant.branch.id !== saved.branch.id)
  const next = saved.permissions.length > 0 ? [...others, saved] : others
  return next.sort((a, b) => a.branch.name.localeCompare(b.branch.name))
}

/** Branch filters on the user list and the Permissions list depend on who holds what, so they are refetched too. */
export function useSyncUserBranchPermissions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: syncUserBranchPermissions,
    onSuccess: (saved, { userId }) => {
      queryClient.setQueryData<BranchPermissions[]>(
        userKeys.branchPermissions(userId),
        (current) => storeBranchPermissions(current, saved)
      )
      queryClient.invalidateQueries({
        queryKey: userKeys.branchPermissions(userId),
      })
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
      queryClient.invalidateQueries({ queryKey: accessKeys.userAccess() })
    },
  })
}

/** The catalog changes only on deploy (`permissions:sync`). */
export function usePermissionCatalog(enabled = true) {
  return useQuery({
    queryKey: accessKeys.permissions(),
    queryFn: listPermissionCatalog,
    staleTime: 5 * 60_000,
    enabled,
  })
}

export function useRoleTemplates(enabled = true) {
  return useQuery({
    queryKey: accessKeys.roles(),
    queryFn: listRoleTemplates,
    staleTime: 60_000,
    enabled,
  })
}

export function useBranchOptions(enabled = true) {
  return useQuery({
    queryKey: accessKeys.branchOptions(),
    queryFn: listBranchOptions,
    staleTime: 5 * 60_000,
    enabled,
  })
}
