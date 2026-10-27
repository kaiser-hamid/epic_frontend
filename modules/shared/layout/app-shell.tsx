"use client"

import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { AuthGate } from "@/modules/shared/auth/components/auth-gate"
import { AppSidebar } from "@/modules/shared/layout/app-sidebar"
import {
  AppBreadcrumbs,
  BreadcrumbLabelProvider,
} from "@/modules/shared/layout/breadcrumbs"
import type { NavItem } from "@/modules/shared/layout/nav"

/** Authenticated layout (shadcn sidebar-07): auth gate, sidebar, header with trigger + breadcrumbs, content. */
export function AppShell({
  navItems,
  children,
}: {
  navItems: NavItem[]
  children: React.ReactNode
}) {
  return (
    <AuthGate>
      <BreadcrumbLabelProvider>
        <SidebarProvider>
          <AppSidebar navItems={navItems} />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
              <div className="flex items-center gap-2 px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator
                  orientation="vertical"
                  className="mr-2 data-[orientation=vertical]:h-4"
                />
                <AppBreadcrumbs navItems={navItems} />
              </div>
            </header>
            <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </BreadcrumbLabelProvider>
    </AuthGate>
  )
}
