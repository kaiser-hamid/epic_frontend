import type { Designation } from "@/modules/shared/auth/enums"
import type { Branch } from "@/modules/shared/auth/types"
import type { RoleRef } from "@/modules/user-management/users/types"

/** One branch of a `UserAccessResource` row. */
export type BranchAccess = {
  branch: Branch
  permission_count: number
  /** Role templates the branch's permissions fully cover (display only). */
  matched_roles: RoleRef[]
  /** Permissions in the branch that no matched role explains. */
  other_permission_count: number
}

/** `UserAccessResource` from `/api/access/user-access`: a user with what they hold, per branch. */
export type UserAccess = {
  id: number
  employee_id: string
  name: string
  username: string
  designation: Designation | null
  is_active: boolean
  is_super_admin: boolean
  /** Total over all branches. */
  permission_count: number
  /** Only branches where the user holds a permission, by branch name. */
  branches: BranchAccess[]
}

/** Filters the backend allows on `GET /api/access/user-access` (always sorted by name). */
export type UserAccessFilters = {
  /** Name, username or employee id (partial). */
  search?: string | null
}
