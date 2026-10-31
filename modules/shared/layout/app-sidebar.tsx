"use client"

import Link from "next/link"

import { Logo, LogoMark } from "@/components/logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { UserMenu } from "@/modules/shared/auth/components/user-menu"
import { useMe } from "@/modules/shared/auth/queries"
import type { NavItem } from "@/modules/shared/layout/nav"
import { NavMain } from "@/modules/shared/layout/nav-main"

/** shadcn sidebar-07: brand header, collapsible module menu, user dropdown footer, icon-collapse rail. */
export function AppSidebar({ navItems }: { navItems: NavItem[] }) {
  const { data: me } = useMe()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="Epic Health Care">
              <Link href="/" aria-label="Epic Health Care, home">
                <LogoMark className="hidden shrink-0 group-data-[collapsible=icon]:block" />
                <div className="grid flex-1 gap-0.5 group-data-[collapsible=icon]:hidden">
                  <Logo className="h-[1.8rem]" />
                  <span className="truncate text-xs text-muted-foreground">
                    {me?.branch.name ?? "ERP"}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <UserMenu />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
