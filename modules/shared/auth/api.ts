import { apiClient, fetchCsrfCookie } from "@/lib/api-client"
import { ErrorCode, hasErrorCode } from "@/lib/api-error"
import type { ResourceResponse } from "@/lib/api-types"
import type {
  ChangePasswordValues,
  LoginValues,
} from "@/modules/shared/auth/schemas"
import type { Branch, Me, UserSession } from "@/modules/shared/auth/types"

/** Current session, or `null` when not logged in (or the session's branch was deactivated). */
export async function fetchMe(): Promise<Me | null> {
  try {
    const response = await apiClient.get<ResourceResponse<Me>>("/api/auth/me")
    return response.data.data
  } catch (error) {
    if (
      hasErrorCode(error, ErrorCode.Unauthenticated) ||
      hasErrorCode(error, ErrorCode.BranchInactive)
    ) {
      return null
    }
    throw error
  }
}

/**
 * Branches offered on the login form for a username. Unknown, inactive and
 * locked accounts all get an empty list. Throttled to 10/min per IP.
 */
export async function fetchLoginBranches(username: string): Promise<Branch[]> {
  await fetchCsrfCookie()
  const response = await apiClient.post<ResourceResponse<Branch[]>>(
    "/api/auth/login-branches",
    { username }
  )
  return response.data.data
}

export async function login(values: LoginValues): Promise<Me> {
  await fetchCsrfCookie()
  const response = await apiClient.post<ResourceResponse<Me>>(
    "/api/auth/login",
    values
  )
  return response.data.data
}

export async function logout(): Promise<void> {
  await apiClient.post("/api/auth/logout")
}

/** Clears `must_change_password` and signs out the user's other sessions. */
export async function changePassword(
  values: ChangePasswordValues
): Promise<void> {
  await apiClient.put("/api/auth/password", values)
}

export async function fetchSessions(): Promise<UserSession[]> {
  const response =
    await apiClient.get<ResourceResponse<UserSession[]>>("/api/auth/sessions")
  return response.data.data
}

export async function revokeSession(sessionId: string): Promise<void> {
  await apiClient.delete(`/api/auth/sessions/${encodeURIComponent(sessionId)}`)
}

export async function revokeOtherSessions(): Promise<number> {
  const response =
    await apiClient.delete<ResourceResponse<{ revoked: number }>>(
      "/api/auth/sessions"
    )
  return response.data.data.revoked
}
