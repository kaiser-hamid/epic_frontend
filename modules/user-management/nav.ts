import { UsersIcon } from "lucide-react"

import type { NavItem } from "@/modules/shared/layout/nav"
import { SharedPermission } from "@/modules/shared/rbac/permissions"

/** Staff accounts and what they may do. */
export const userManagementNav: NavItem = {
  title: "User Management",
  icon: UsersIcon,
  items: [
    {
      title: "New user",
      href: "/user-management/users/new",
      permission: SharedPermission.UserCreate,
    },
    {
      title: "User list",
      href: "/user-management/users",
      permission: SharedPermission.UserView,
    },
    {
      title: "Permissions",
      href: "/user-management/permissions",
      permission: SharedPermission.UserAssignPermissions,
    },
  ],
}
