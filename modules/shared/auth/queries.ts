"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  changePassword,
  fetchLoginBranches,
  fetchMe,
  fetchSessions,
  login,
  logout,
  revokeOtherSessions,
  revokeSession,
} from "@/modules/shared/auth/api"

export const authKeys = {
  all: ["auth"] as const,
  me: () => [...authKeys.all, "me"] as const,
  loginBranches: (username: string) =>
    [...authKeys.all, "login-branches", username] as const,
  sessions: () => [...authKeys.all, "sessions"] as const,
}

/** The session user, branch and permissions. Refetched only after login, logout or a password change. */
export function useMe() {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: fetchMe,
    staleTime: Infinity,
    retry: false,
  })
}

/** Looked up once per username (on blur), because the endpoint is throttled. */
export function useLoginBranches(username: string) {
  return useQuery({
    queryKey: authKeys.loginBranches(username),
    queryFn: () => fetchLoginBranches(username),
    enabled: username.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}

/** All cached data is branch-scoped, so the whole cache is dropped on login. */
export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: login,
    onSuccess: (me) => {
      queryClient.clear()
      queryClient.setQueryData(authKeys.me(), me)
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      queryClient.clear()
      queryClient.setQueryData(authKeys.me(), null)
    },
  })
}

export function useChangePassword() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: changePassword,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: authKeys.me() }),
        queryClient.invalidateQueries({ queryKey: authKeys.sessions() }),
      ]),
  })
}

export function useSessions() {
  return useQuery({ queryKey: authKeys.sessions(), queryFn: fetchSessions })
}

export function useRevokeSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: revokeSession,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: authKeys.sessions() }),
  })
}

export function useRevokeOtherSessions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: revokeOtherSessions,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: authKeys.sessions() }),
  })
}
