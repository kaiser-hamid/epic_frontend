"use client"

import { ChevronRightIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useMe } from "@/modules/shared/auth/queries"
import {
  isActivePath,
  type NavItem,
  type NavSubItem,
} from "@/modules/shared/layout/nav"
import { allows } from "@/modules/shared/rbac/use-can"
import type { Me } from "@/modules/shared/auth/types"

/** Drops links the user lacks permission for, then parents left without links. */
export function visibleNavItems(
  items: NavItem[],
  me: Me | null | undefined
): NavItem[] {
  const permitted = (entry: { permission?: string }) =>
    !entry.permission || allows(me, entry.permission)

  return items.flatMap((item) => {
    if (!permitted(item)) {
      return []
    }
    if (!item.items) {
      return [item]
    }
    const subItems = item.items.filter(permitted)
    return subItems.length > 0 ? [{ ...item, items: subItems }] : []
  })
}

/**
 * sidebar-07 navigation: icon parents that expand into a sub menu with a
 * vertical guide line. In icon-only mode a parent opens its links in a
 * dropdown to the right instead.
 */
export function NavMain({ items }: { items: NavItem[] }) {
  const pathname = usePathname()
  const { data: me } = useMe()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Menu</SidebarGroupLabel>
      <SidebarMenu>
        {visibleNavItems(items, me).map((item) =>
          item.items ? (
            <NavParent
              key={item.title}
              item={item}
              subItems={item.items}
              pathname={pathname}
            />
          ) : (
            <NavLinkItem key={item.title} item={item} pathname={pathname} />
          )
        )}
      </SidebarMenu>
    </SidebarGroup>
  )
}

function NavLinkItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon
  const href = item.href ?? "/"

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActivePath(pathname, href)}
        tooltip={item.title}
      >
        <Link href={href}>
          <Icon />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function NavParent({
  item,
  subItems,
  pathname,
}: {
  item: NavItem
  subItems: NavSubItem[]
  pathname: string
}) {
  const { state, isMobile } = useSidebar()
  const Icon = item.icon
  const active = subItems.some((subItem) =>
    isActivePath(pathname, subItem.href)
  )

  if (state === "collapsed" && !isMobile) {
    return (
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton isActive={active} tooltip={item.title}>
              <Icon />
              <span>{item.title}</span>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="min-w-48">
            <DropdownMenuLabel>{item.title}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {subItems.map((subItem) => (
              <DropdownMenuItem key={subItem.href} asChild>
                <Link href={subItem.href}>{subItem.title}</Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    )
  }

  return (
    <Collapsible asChild defaultOpen={active} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton isActive={active} tooltip={item.title}>
            <Icon />
            <span>{item.title}</span>
            <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {subItems.map((subItem) => (
              <SidebarMenuSubItem key={subItem.href}>
                <SidebarMenuSubButton
                  asChild
                  isActive={isActivePath(pathname, subItem.href)}
                >
                  <Link href={subItem.href}>
                    <span>{subItem.title}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}
