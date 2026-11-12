import { apiClient } from "@/lib/api-client"
import type {
  ListParams,
  PaginatedResponse,
  ResourceResponse,
} from "@/lib/api-types"
import { emptyToNull } from "@/lib/utils"
import type {
  CreateUserValues,
  ResetPasswordValues,
  UpdateUserValues,
} from "@/modules/user-management/users/schemas"
import type {
  BranchPermissions,
  BranchWithModules,
  PermissionCatalogEntry,
  RoleTemplate,
  User,
  UserFilters,
} from "@/modules/user-management/users/types"

const basePath = "/api/access/users"

export type UserListParams = Omit<ListParams, "filter" | "include" | "sort"> & {
  filter?: UserFilters
}

/** Sorted by name. */
export async function listUsers(
  params: UserListParams
): Promise<PaginatedResponse<User>> {
  const response = await apiClient.get<PaginatedResponse<User>>(basePath, {
    params,
  })
  return response.data
}

export async function getUser(id: number): Promise<User> {
  const response = await apiClient.get<ResourceResponse<User>>(
    `${basePath}/${id}`
  )
  return response.data.data
}

/** The backend generates the employee id. The account starts active with no permissions and must change its password on first login. */
export async function createUser(values: CreateUserValues): Promise<User> {
  const response = await apiClient.post<ResourceResponse<User>>(basePath, {
    name: values.name.trim(),
    username: values.username.trim(),
    password: values.password,
    designation: values.designation || null,
    phone: emptyToNull(values.phone),
  })
  return response.data.data
}

/** Changed profile fields → body: only the fields sent, empty texts as null. */
export function toUpdateUserPayload(changes: Partial<UpdateUserValues>) {
  return {
    name: changes.name?.trim(),
    designation:
      changes.designation === undefined
        ? undefined
        : changes.designation || null,
    phone: changes.phone === undefined ? undefined : emptyToNull(changes.phone),
  }
}

export type UpdateUserInput = {
  id: number
  changes: Partial<UpdateUserValues>
}

/** Name, designation and phone only. Employee id and username never change; status, password and permissions have their own endpoints. */
export async function updateUser({
  id,
  changes,
}: UpdateUserInput): Promise<User> {
  const response = await apiClient.patch<ResourceResponse<User>>(
    `${basePath}/${id}`,
    toUpdateUserPayload(changes)
  )
  return response.data.data
}

export async function activateUser(id: number): Promise<User> {
  const response = await apiClient.post<ResourceResponse<User>>(
    `${basePath}/${id}/activate`
  )
  return response.data.data
}

/** Also signs the user out of every device. Their permissions are kept. */
export async function deactivateUser(id: number): Promise<User> {
  const response = await apiClient.post<ResourceResponse<User>>(
    `${basePath}/${id}/deactivate`
  )
  return response.data.data
}

export type ResetUserPasswordInput = {
  id: number
  values: ResetPasswordValues
}

/** Temporary password: the user must change it on next login, and all their sessions end. 204. */
export async function resetUserPassword({
  id,
  values,
}: ResetUserPasswordInput): Promise<void> {
  await apiClient.post(`${basePath}/${id}/reset-password`, {
    password: values.password,
  })
}

/** Only the branches where the user holds at least one permission, by branch name. */
export async function listUserBranchPermissions(
  id: number
): Promise<BranchPermissions[]> {
  const response = await apiClient.get<ResourceResponse<BranchPermissions[]>>(
    `${basePath}/${id}/branch-permissions`
  )
  return response.data.data
}

export type SyncBranchPermissionsInput = {
  userId: number
  branchId: number
  permissions: string[]
  /** Role templates fully ticked when saving; recorded in the audit log only. */
  appliedRoleIds?: number[]
}

/** Replaces the user's permissions in one branch with exactly `permissions`. */
export async function syncUserBranchPermissions({
  userId,
  branchId,
  permissions,
  appliedRoleIds = [],
}: SyncBranchPermissionsInput): Promise<BranchPermissions> {
  const response = await apiClient.put<ResourceResponse<BranchPermissions>>(
    `${basePath}/${userId}/branches/${branchId}/permissions`,
    { permissions, applied_role_ids: appliedRoleIds }
  )
  return response.data.data
}

/** Every permission, ordered by module, group and name. Needs `sh.user.view`. */
export async function listPermissionCatalog(): Promise<
  PermissionCatalogEntry[]
> {
  const response = await apiClient.get<
    ResourceResponse<PermissionCatalogEntry[]>
  >("/api/access/permission-options")
  return response.data.data
}

/** Role templates with their permissions, by name. Needs `sh.user.view`. */
export async function listRoleTemplates(): Promise<RoleTemplate[]> {
  const response = await apiClient.get<ResourceResponse<RoleTemplate[]>>(
    "/api/access/role-options"
  )
  return response.data.data
}

/** Active branches a permission can be assigned in, with the optional modules each runs. */
export async function listBranchOptions(): Promise<BranchWithModules[]> {
  const response = await apiClient.get<ResourceResponse<BranchWithModules[]>>(
    "/api/access/branch-options"
  )
  return response.data.data
}
