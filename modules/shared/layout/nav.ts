import type { LucideIcon } from "lucide-react"

import type { Permission } from "@/modules/shared/rbac/use-can"

/** A page link inside a module's sub menu. */
export type NavSubItem = {
  title: string
  href: string
  /** Required permission; the link is hidden without it. Omit only for pages every user may see. */
  permission?: Permission
}

/**
 * A top-level sidebar entry with an icon. With `items` it is a collapsible
 * parent (one per business module, exported from `modules/{name}/nav.ts`);
 * without, it links to `href` directly (e.g. Dashboard).
 */
export type NavItem = {
  title: string
  icon: LucideIcon
  href?: string
  permission?: Permission
  items?: NavSubItem[]
}

/** `/blood-bank/cases` is active on `/blood-bank/cases/12/edit`, not on `/blood-bank/cases-archive`. */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/"
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}
