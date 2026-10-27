import { HomeIcon, ListIcon } from "lucide-react"
import { describe, expect, it } from "vitest"

import type { Me } from "@/modules/shared/auth/types"
import { buildCrumbs } from "@/modules/shared/layout/breadcrumbs"
import type { NavItem } from "@/modules/shared/layout/nav"
import { visibleNavItems } from "@/modules/shared/layout/nav-main"

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/", icon: HomeIcon },
  {
    title: "Blood Bank",
    icon: ListIcon,
    items: [
      { title: "Cases", href: "/blood-bank/cases", permission: "bb.case.view" },
      { title: "Units", href: "/blood-bank/units", permission: "bb.unit.view" },
    ],
  },
]

function me(permissions: string[], isSuperAdmin = false): Me {
  return {
    user: {
      id: 1,
      employee_id: null,
      name: "Test",
      username: "test",
      designation: null,
    },
    branch: { id: 1, code: "B1", name: "Branch" },
    permissions,
    is_super_admin: isSuperAdmin,
    must_change_password: false,
  }
}

describe("visibleNavItems", () => {
  it("keeps only permitted links and drops parents left empty", () => {
    expect(visibleNavItems(navItems, me(["bb.case.view"]))).toEqual([
      navItems[0],
      { ...navItems[1], items: [navItems[1]?.items?.[0]] },
    ])
    expect(visibleNavItems(navItems, me([]))).toEqual([navItems[0]])
  })

  it("shows everything to a super admin", () => {
    expect(visibleNavItems(navItems, me([], true))).toEqual(navItems)
  })
})

describe("buildCrumbs", () => {
  it("builds module, page and trailing segments, linking all but the last", () => {
    expect(buildCrumbs("/blood-bank/cases/12/edit", navItems)).toEqual([
      { label: "Blood Bank" },
      { label: "Cases", href: "/blood-bank/cases" },
      { label: "#12", href: "/blood-bank/cases/12" },
      { label: "Edit" },
    ])
  })

  it("uses labels registered by pages for raw segments", () => {
    expect(
      buildCrumbs("/blood-bank/cases/12", navItems, { "12": "BB-0012" })
    ).toEqual([
      { label: "Blood Bank" },
      { label: "Cases", href: "/blood-bank/cases" },
      { label: "BB-0012" },
    ])
  })

  it("shows the dashboard at the root", () => {
    expect(buildCrumbs("/", navItems)).toEqual([{ label: "Dashboard" }])
  })
})
