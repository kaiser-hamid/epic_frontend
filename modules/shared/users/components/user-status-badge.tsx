import { Badge } from "@/components/ui/badge"
import type { User } from "@/modules/shared/users/types"

/** Active / Disabled, plus Locked (too many failed logins) and Super admin when they apply. */
export function UserStatusBadges({
  user,
}: {
  user: Pick<User, "is_active" | "is_locked" | "is_super_admin">
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {user.is_active ? (
        <Badge variant="success">Active</Badge>
      ) : (
        <Badge variant="destructive">Disabled</Badge>
      )}
      {user.is_locked ? <Badge variant="warning">Locked</Badge> : null}
      {user.is_super_admin ? <Badge variant="info">Super admin</Badge> : null}
    </span>
  )
}
