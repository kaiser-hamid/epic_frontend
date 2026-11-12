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
  branch: BranchWithModules
  permissions: string[]
  /** Role templates the permissions fully cover (display only); a template inside a bigger match is left out. */
  matched_roles: RoleRef[]
  /** Permissions no matched role explains. */
  other_permissions: string[]
}

/**
 * A branch with the optional modules it runs (e.g. `["blood-bank"]`). Modules every branch has are not
 * listed. A permission of an optional module the branch does not run cannot be given there and allows nothing.
 */
export type BranchWithModules = Branch & {
  modules: string[]
}

/** A role template named by the backend's role matching. */
export type RoleRef = {
  id: number
  name: string
}

/**
 * `PermissionResource`: one catalog entry. `module_label` is the top-level heading of the permission screen
 * (ordered by `module_order`); it is layout only, never selectable.
 */
export type PermissionCatalogEntry = {
  name: string
  /** Module key, e.g. `blood-bank`, `billing`, `access`. */
  module: string
  module_label: string
  module_order: number
  /** True when only some branches run the module (see `BranchWithModules.modules`). */
  module_is_optional: boolean
  group: string
  description: string | null
}

/** `RoleResource`: a permission template within one module. Picking one pre-checks its permissions; it never grants access. */
export type RoleTemplate = {
  id: number
  name: string
  /** Module key; every permission of the template belongs to it. */
  module: string | null
  description: string | null
  permissions: string[]
}
