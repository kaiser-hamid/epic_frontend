"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { FormProvider, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Form } from "@/components/form"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { errorMessage } from "@/lib/api-error"
import { applyServerErrors } from "@/lib/form-errors"
import { PasswordFields } from "@/modules/shared/users/components/password-fields"
import { userErrorMessages } from "@/modules/shared/users/error-messages"
import { useResetUserPassword } from "@/modules/shared/users/queries"
import {
  resetPasswordSchema,
  type ResetPasswordValues,
} from "@/modules/shared/users/schemas"
import type { User } from "@/modules/shared/users/types"

const emptyPassword: ResetPasswordValues = {
  password: "",
  password_confirmation: "",
}

/**
 * Sets a temporary password. The backend signs the user out everywhere, clears any lock
 * and makes them choose a new password on next sign-in.
 */
export function ResetPasswordDialog({
  user,
  open,
  onOpenChange,
}: {
  user: User
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const resetPassword = useResetUserPassword()
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: emptyPassword,
  })

  useEffect(() => {
    if (open) {
      form.reset(emptyPassword)
    }
  }, [open, form])

  function onSubmit(values: ResetPasswordValues) {
    resetPassword.mutate(
      { id: user.id, values },
      {
        onSuccess: () => {
          toast.success(
            `Password reset. ${user.name} must change it on next sign-in.`
          )
          onOpenChange(false)
        },
        onError: (error) => {
          if (!applyServerErrors(error, form.setError)) {
            toast.error(errorMessage(error, userErrorMessages))
          }
        },
      }
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={resetPassword.isPending ? undefined : onOpenChange}
    >
      <DialogContent
        // Clicking the backdrop must not close it; Esc and Cancel still do.
        onInteractOutside={(event) => event.preventDefault()}
      >
        <FormProvider {...form}>
          <Form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <DialogHeader>
              <DialogTitle>Reset password</DialogTitle>
              <DialogDescription>
                {user.name} ({user.username}) will be signed out of every device
                and must choose a new password on next sign-in.
              </DialogDescription>
            </DialogHeader>

            <FieldGroup className="gap-4">
              <PasswordFields label="Temporary password" />
            </FieldGroup>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={resetPassword.isPending}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={resetPassword.isPending}>
                {resetPassword.isPending ? <Spinner /> : null}
                Reset password
              </Button>
            </DialogFooter>
          </Form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  )
}
