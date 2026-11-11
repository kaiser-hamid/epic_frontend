"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { FormProvider, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Form } from "@/components/form"
import {
  EnumControl,
  MobileControl,
  TextControl,
} from "@/components/form-controls"
import { ReadonlyInput } from "@/components/readonly-input"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { errorMessage } from "@/lib/api-error"
import { pickDirty } from "@/lib/dirty-values"
import { applyServerErrors } from "@/lib/form-errors"
import { designationLabels } from "@/modules/shared/auth/enums"
import { PasswordFields } from "@/modules/shared/users/components/password-fields"
import { userErrorMessages } from "@/modules/shared/users/error-messages"
import { useCreateUser, useUpdateUser } from "@/modules/shared/users/queries"
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserValues,
  type UpdateUserValues,
} from "@/modules/shared/users/schemas"
import type { User } from "@/modules/shared/users/types"

type DialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Clicking the backdrop must not throw away what was typed; Esc and Cancel still close. */
function keepOpenOnOutsideClick(event: Event) {
  event.preventDefault()
}

const emptyUser: CreateUserValues = {
  name: "",
  username: "",
  designation: "",
  phone: "",
  password: "",
  password_confirmation: "",
}

function DesignationAndPhoneFields() {
  return (
    <>
      <EnumControl
        name="designation"
        label="Designation"
        labels={designationLabels}
        placeholder="Select designation"
        optional
        searchable
      />
      <MobileControl name="phone" label="Phone" />
    </>
  )
}

/**
 * New staff account. The backend assigns the employee id; the account starts active with
 * no permissions and must replace the initial password on first login. Opens the new
 * user's page to assign permissions.
 */
export function CreateUserDialog({ open, onOpenChange }: DialogProps) {
  const router = useRouter()
  const createUser = useCreateUser()
  const form = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: emptyUser,
  })

  useEffect(() => {
    if (open) {
      form.reset(emptyUser)
    }
  }, [open, form])

  function onSubmit(values: CreateUserValues) {
    createUser.mutate(values, {
      onSuccess: (user) => {
        toast.success(`User ${user.username} created (${user.employee_id})`)
        onOpenChange(false)
        router.push(`/config/users/${user.id}`)
      },
      onError: (error) => {
        if (!applyServerErrors(error, form.setError)) {
          toast.error(errorMessage(error, userErrorMessages))
        }
      },
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={createUser.isPending ? undefined : onOpenChange}
    >
      <DialogContent
        className="sm:max-w-lg"
        onInteractOutside={keepOpenOnOutsideClick}
      >
        <FormProvider {...form}>
          <Form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <DialogHeader>
              <DialogTitle>New user</DialogTitle>
              <DialogDescription>
                The employee ID is assigned automatically. The user must change
                this password on first sign-in.
              </DialogDescription>
            </DialogHeader>

            <FieldGroup className="gap-4">
              <TextControl name="name" label="Name" required />
              <TextControl
                name="username"
                label="Username"
                required
                description="Used to sign in; cannot be changed later. Letters, numbers, dashes and underscores."
              />
              <DesignationAndPhoneFields />
              <PasswordFields />
            </FieldGroup>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={createUser.isPending}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createUser.isPending}>
                {createUser.isPending ? <Spinner /> : null}
                Create user
              </Button>
            </DialogFooter>
          </Form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  )
}

function profileValues(user: User): UpdateUserValues {
  return {
    name: user.name,
    designation: user.designation ?? "",
    phone: user.phone ?? "",
  }
}

/**
 * Name, designation and phone. Employee ID and username are shown but never change.
 * Sends just what changed; the backend audits old and new values.
 */
export function EditUserDialog({
  user,
  open,
  onOpenChange,
}: DialogProps & { user: User }) {
  const updateUser = useUpdateUser()
  const form = useForm<UpdateUserValues>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: profileValues(user),
  })

  useEffect(() => {
    if (open) {
      form.reset(profileValues(user))
    }
  }, [open, user, form])

  function onSubmit(values: UpdateUserValues) {
    const changes = pickDirty(values, form.formState.dirtyFields)
    if (Object.keys(changes).length === 0) {
      onOpenChange(false)
      return
    }
    updateUser.mutate(
      { id: user.id, changes },
      {
        onSuccess: () => {
          toast.success("User saved")
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
      onOpenChange={updateUser.isPending ? undefined : onOpenChange}
    >
      <DialogContent
        className="sm:max-w-lg"
        onInteractOutside={keepOpenOnOutsideClick}
      >
        <FormProvider {...form}>
          <Form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <DialogHeader>
              <DialogTitle>Edit user</DialogTitle>
              <DialogDescription>{user.name}</DialogDescription>
            </DialogHeader>

            <FieldGroup className="gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="employee_id">Employee ID</FieldLabel>
                  <ReadonlyInput id="employee_id" value={user.employee_id} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="username">Username</FieldLabel>
                  <ReadonlyInput id="username" value={user.username} />
                </Field>
              </div>
              <TextControl name="name" label="Name" required />
              <DesignationAndPhoneFields />
            </FieldGroup>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={updateUser.isPending}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateUser.isPending}>
                {updateUser.isPending ? <Spinner /> : null}
                Save
              </Button>
            </DialogFooter>
          </Form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  )
}
