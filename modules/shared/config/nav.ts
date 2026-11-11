import { SettingsIcon } from "lucide-react"

import type { NavItem } from "@/modules/shared/layout/nav"
import { SharedPermission } from "@/modules/shared/rbac/permissions"

/** Application configuration (Shared): users and their branch permissions. */
export const configNav: NavItem = {
  title: "Config",
  icon: SettingsIcon,
  items: [
    {
      title: "User Management",
      href: "/config/users",
      permission: SharedPermission.UserView,
    },
  ],
}
