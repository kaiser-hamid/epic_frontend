"use client"

import { useMe } from "@/modules/shared/auth/queries"
import type { Me } from "@/modules/shared/auth/types"

/** A permission key such as `bb.case.create`. Use the module's `permissions.ts` constants, never literals. */
export type Permission = string

export function allows(
  me: Me | null | undefined,
  permission: Permission
): boolean {
  if (!me) {
    return false
  }
  return me.is_super_admin || me.permissions.includes(permission)
}

/**
 * UI gating only; the backend authorizes every request. For a specific record,
 * prefer the `abilities` the backend returns on it.
 */
export function useCan(permission: Permission): boolean {
  const { data: me } = useMe()
  return allows(me, permission)
}

export function useCanAny(permissions: readonly Permission[]): boolean {
  const { data: me } = useMe()
  return permissions.some((permission) => allows(me, permission))
}
