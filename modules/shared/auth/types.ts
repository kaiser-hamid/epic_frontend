/** `BranchResource` as returned by `POST /api/auth/login-branches` and inside `Me`. */
export type Branch = {
  id: number
  code: string
  name: string
}

export type AuthUser = {
  id: number
  employee_id: string | null
  name: string
  username: string
  designation: string | null
}

/**
 * `UserProfileResource` from `GET /api/auth/me` and `POST /api/auth/login`.
 * `permissions` apply to `branch` (the branch chosen at login) only.
 */
export type Me = {
  user: AuthUser
  branch: Branch
  permissions: string[]
  is_super_admin: boolean
  must_change_password: boolean
}

/** `SessionResource`: one of the signed-in user's devices. */
export type UserSession = {
  id: string
  branch: Branch | null
  ip_address: string | null
  user_agent: string | null
  last_activity_at: string
  is_current: boolean
}
