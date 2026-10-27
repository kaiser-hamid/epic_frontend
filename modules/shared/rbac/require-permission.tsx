"use client"

import { Forbidden } from "@/components/forbidden"
import { useCanAny, type Permission } from "@/modules/shared/rbac/use-can"

/**
 * Route guard for a page or route-segment layout. Hiding a nav link does not
 * protect its URL, so every protected page renders inside one of these.
 * Pass several permissions to allow any of them.
 */
export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission | readonly Permission[]
  children: React.ReactNode
}) {
  const permissions = typeof permission === "string" ? [permission] : permission
  const allowed = useCanAny(permissions)

  return allowed ? children : <Forbidden />
}
