"use client"

import { EyeIcon, MoreVerticalIcon } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/**
 * Last column of a table: a three-dot button that opens the row's actions. `label` names
 * the row for screen readers ("Actions for BC2610000015").
 */
export function RowActions({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Actions for ${label}`}
        >
          <MoreVerticalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">{children}</DropdownMenuContent>
    </DropdownMenu>
  )
}

/** "View" item that opens the record's detail page. */
export function ViewRowAction({ href }: { href: string }) {
  return (
    <DropdownMenuItem asChild>
      <Link href={href}>
        <EyeIcon />
        View
      </Link>
    </DropdownMenuItem>
  )
}
