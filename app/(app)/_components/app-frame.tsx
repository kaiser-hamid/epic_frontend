"use client"

import { LayoutDashboardIcon } from "lucide-react"

import { bloodBankNav } from "@/modules/blood-bank/nav"
import { billingNav } from "@/modules/shared/billing/nav"
import { configNav } from "@/modules/shared/config/nav"
import { AppShell } from "@/modules/shared/layout/app-shell"
import type { NavItem } from "@/modules/shared/layout/nav"

/**
 * Sidebar order. Add each new module's nav item here. Lives in a client file
 * because nav items carry icon components, which cannot cross the server boundary.
 */
const navItems: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboardIcon },
  billingNav,
  bloodBankNav,
  configNav,
]

export function AppFrame({ children }: { children: React.ReactNode }) {
  return <AppShell navItems={navItems}>{children}</AppShell>
}
