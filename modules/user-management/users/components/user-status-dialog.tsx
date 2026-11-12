"use client"

import { toast } from "sonner"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { errorMessage } from "@/lib/api-error"
import { userErrorMessages } from "@/modules/user-management/users/error-messages"
import {
  useActivateUser,
  useDeactivateUser,
} from "@/modules/user-management/users/queries"
import type { User } from "@/modules/user-management/users/types"

/** Enables a disabled account, or disables an active one (which also signs it out everywhere). */
export function UserStatusDialog({
  user,
  open,
  onOpenChange,
}: {
  user: User
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const activateUser = useActivateUser()
  const deactivateUser = useDeactivateUser()
  const mutation = user.is_active ? deactivateUser : activateUser

  function onConfirm() {
    mutation.mutate(user.id, {
      onSuccess: (saved) => {
        toast.success(
          saved.is_active
            ? `${saved.name} can sign in again`
            : `${saved.name} is disabled`
        )
        onOpenChange(false)
      },
      onError: (error) => {
        toast.error(errorMessage(error, userErrorMessages))
      },
    })
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={user.is_active ? `Disable ${user.name}?` : `Enable ${user.name}?`}
      description={
        user.is_active
          ? "The user is signed out of every device and cannot sign in until enabled again. Their permissions are kept."
          : "The user can sign in again with their existing password and permissions."
      }
      confirmLabel={user.is_active ? "Disable" : "Enable"}
      destructive={user.is_active}
      pending={mutation.isPending}
      onConfirm={onConfirm}
    />
  )
}
