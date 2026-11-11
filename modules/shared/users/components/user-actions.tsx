"use client"

import {
  KeyRoundIcon,
  PencilIcon,
  UserCheckIcon,
  UserXIcon,
} from "lucide-react"
import { useState } from "react"

import { RowActions, ViewRowAction } from "@/components/data-table/row-actions"
import { Button } from "@/components/ui/button"
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { ResetPasswordDialog } from "@/modules/shared/users/components/reset-password-dialog"
import { EditUserDialog } from "@/modules/shared/users/components/user-form-dialog"
import { UserStatusDialog } from "@/modules/shared/users/components/user-status-dialog"
import type { User } from "@/modules/shared/users/types"

type UserDialog = "edit" | "status" | "reset-password"

/** Account dialogs. Each action is offered only when the backend's `abilities` allow it. */
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
      {user.abilities.update ? (
        <EditUserDialog
          user={user}
          open={dialog === "edit"}
          onOpenChange={openChange("edit")}
        />
      ) : null}
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

/** Three-dot menu of a user list row. */
export function UserRowActions({ user }: { user: User }) {
  const [dialog, setDialog] = useState<UserDialog | null>(null)
  const { abilities } = user
  const hasActions =
    abilities.update || abilities.change_status || abilities.reset_password

  return (
    <>
      <RowActions label={user.username}>
        <ViewRowAction href={`/config/users/${user.id}`} />
        {hasActions ? <DropdownMenuSeparator /> : null}
        {abilities.update ? (
          <DropdownMenuItem onSelect={() => setDialog("edit")}>
            <PencilIcon />
            Edit
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
        <Button variant="outline" onClick={() => setDialog("edit")}>
          <PencilIcon data-icon="inline-start" />
          Edit
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
