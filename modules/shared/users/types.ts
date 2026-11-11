import type { Abilities } from "@/lib/api-types"
import type { Designation } from "@/modules/shared/auth/enums"
import type { Branch } from "@/modules/shared/auth/types"

/** Account actions the backend `UserPolicy` allows the signed-in admin on this user. */
export type UserAbilities = Abilities<
  "update" | "change_status" | "reset_password" | "assign_permissions"
>

/** `UserResource` from `/api/access/users`. Passwords are never returned. */
export type User = {
  id: number
  employee_id: string
  name: string
  username: string
  designation: Designation | null
  phone: string | null
  is_active: boolean
  is_super_admin: boolean
  is_locked: boolean
  locked_until: string | null
  must_change_password: boolean
  last_login_at: string | null
  created_at: string | null
  abilities: UserAbilities
}

/** Filters the backend allows on `GET /api/access/users` (always sorted by name). */
export type UserFilters = {
  /** Name, username or employee id (partial). */
  search?: string | null
  is_active?: boolean | null
  /** Users holding any permission in this branch. */
  branch_id?: number | null
}

/** `BranchPermissionsResource`: what a user holds in one branch. */
export type BranchPermissions = {
  branch: Branch
  permissions: string[]
}

/** `PermissionResource`: one catalog entry, grouped by `module` then `group` in the UI. */
export type PermissionCatalogEntry = {
  name: string
  module: string
  group: string
  description: string | null
}

/** `RoleResource`: a permission template. Picking one pre-checks its permissions; it never grants access. */
export type RoleTemplate = {
  id: number
  name: string
  description: string | null
  permissions: string[]
}
