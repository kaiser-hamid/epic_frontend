"use client"

import { useCan, type Permission } from "@/modules/shared/rbac/use-can"

/** Renders `children` only when the user has `permission` in the current branch. */
export function Can({
  permission,
  fallback = null,
  children,
}: {
  permission: Permission
  fallback?: React.ReactNode
  children: React.ReactNode
}) {
  return useCan(permission) ? children : fallback
}
