"use client"

import {
  KeyRoundIcon,
  PencilIcon,
  UserCheckIcon,
  UserXIcon,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { RowActions, ViewRowAction } from "@/components/data-table/row-actions"
import { Button } from "@/components/ui/button"
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { ResetPasswordDialog } from "@/modules/user-management/users/components/reset-password-dialog"
import { UserStatusDialog } from "@/modules/user-management/users/components/user-status-dialog"
import type { User } from "@/modules/user-management/users/types"

type UserDialog = "status" | "reset-password"

/** Status and password dialogs (editing has its own page). Each action is offered only when the backend's `abilities` allow it. */
function UserDialogs({
  user,
  dialog,
  onDialogChange,
}: {
  user: User
  dialog: UserDialog | null
  onDialogChange: (dialog: UserDialog | null) => void
}) {
  const openChange = (kind: UserDialog) => (open: boolean) =>
    onDialogChange(open ? kind : null)

  return (
    <>
      {user.abilities.change_status ? (
        <UserStatusDialog
          user={user}
          open={dialog === "status"}
          onOpenChange={openChange("status")}
        />
      ) : null}
      {user.abilities.reset_password ? (
        <ResetPasswordDialog
          user={user}
          open={dialog === "reset-password"}
          onOpenChange={openChange("reset-password")}
        />
      ) : null}
    </>
  )
}

function editHref(user: User): string {
  return `/user-management/users/${user.id}/edit`
}

/** Three-dot menu of a user list row. */
export function UserRowActions({ user }: { user: User }) {
  const [dialog, setDialog] = useState<UserDialog | null>(null)
  const { abilities } = user
  const hasActions =
    abilities.update || abilities.change_status || abilities.reset_password

  return (
    <>
      <RowActions label={user.username}>
        <ViewRowAction href={`/user-management/users/${user.id}`} />
        {hasActions ? <DropdownMenuSeparator /> : null}
        {abilities.update ? (
          <DropdownMenuItem asChild>
            <Link href={editHref(user)}>
              <PencilIcon />
              Edit
            </Link>
          </DropdownMenuItem>
        ) : null}
        {abilities.reset_password ? (
          <DropdownMenuItem onSelect={() => setDialog("reset-password")}>
            <KeyRoundIcon />
            Reset password
          </DropdownMenuItem>
        ) : null}
        {abilities.change_status ? (
          <DropdownMenuItem
            variant={user.is_active ? "destructive" : "default"}
            onSelect={() => setDialog("status")}
          >
            {user.is_active ? <UserXIcon /> : <UserCheckIcon />}
            {user.is_active ? "Disable" : "Enable"}
          </DropdownMenuItem>
        ) : null}
      </RowActions>
      <UserDialogs user={user} dialog={dialog} onDialogChange={setDialog} />
    </>
  )
}

/** Header buttons of the user page. */
export function UserActionButtons({ user }: { user: User }) {
  const [dialog, setDialog] = useState<UserDialog | null>(null)
  const { abilities } = user

  return (
    <>
      {abilities.update ? (
        <Button variant="outline" asChild>
          <Link href={editHref(user)}>
            <PencilIcon data-icon="inline-start" />
            Edit
          </Link>
        </Button>
      ) : null}
      {abilities.reset_password ? (
        <Button variant="outline" onClick={() => setDialog("reset-password")}>
          <KeyRoundIcon data-icon="inline-start" />
          Reset password
        </Button>
      ) : null}
      {abilities.change_status ? (
        <Button
          variant={user.is_active ? "destructive" : "default"}
          onClick={() => setDialog("status")}
        >
          {user.is_active ? (
            <UserXIcon data-icon="inline-start" />
          ) : (
            <UserCheckIcon data-icon="inline-start" />
          )}
          {user.is_active ? "Disable" : "Enable"}
        </Button>
      ) : null}
      <UserDialogs user={user} dialog={dialog} onDialogChange={setDialog} />
    </>
  )
}
