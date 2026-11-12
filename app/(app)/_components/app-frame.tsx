"use client"

import { LayoutDashboardIcon } from "lucide-react"

import { bloodBankNav } from "@/modules/blood-bank/nav"
import { billingNav } from "@/modules/shared/billing/nav"
import { AppShell } from "@/modules/shared/layout/app-shell"
import type { NavItem } from "@/modules/shared/layout/nav"
import { userManagementNav } from "@/modules/user-management/nav"

/**
 * Sidebar order. Add each new module's nav item here. Lives in a client file
 * because nav items carry icon components, which cannot cross the server boundary.
 */
const navItems: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboardIcon },
  billingNav,
  bloodBankNav,
  userManagementNav,
]

export function AppFrame({ children }: { children: React.ReactNode }) {
  return <AppShell navItems={navItems}>{children}</AppShell>
}
