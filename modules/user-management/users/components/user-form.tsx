"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormProvider, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Form } from "@/components/form"
import { TextControl } from "@/components/form-controls"
import { ReadonlyInput } from "@/components/readonly-input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { errorMessage } from "@/lib/api-error"
import { pickDirty } from "@/lib/dirty-values"
import { applyServerErrors } from "@/lib/form-errors"
import { PasswordFields } from "@/modules/user-management/users/components/password-fields"
import { DesignationAndPhoneFields } from "@/modules/user-management/users/components/profile-fields"
import { userErrorMessages } from "@/modules/user-management/users/error-messages"
import {
  useCreateUser,
  useUpdateUser,
} from "@/modules/user-management/users/queries"
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserValues,
  type UpdateUserValues,
} from "@/modules/user-management/users/schemas"
import type { User } from "@/modules/user-management/users/types"

function ReadonlyField({
  id,
  label,
  value,
  description,
}: {
  id: string
  label: string
  value: string | null
  description?: string
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <ReadonlyInput id={id} value={value} />
      {description ? <FieldDescription>{description}</FieldDescription> : null}
    </Field>
  )
}

/**
 * Card, field grid and buttons shared by the new-user and edit-user pages, so both look the
 * same. Fields are laid out in the order users fill them, with the submit button last.
 */
function UserFormLayout({
  onSubmit,
  cancelHref,
  submitLabel,
  pending,
  disabled,
  children,
}: {
  onSubmit: React.FormEventHandler<HTMLFormElement>
  cancelHref: string
  submitLabel: string
  pending: boolean
  disabled: boolean
  children: React.ReactNode
}) {
  return (
    <Card className="max-w-2xl">
      <CardContent>
        <Form onSubmit={onSubmit} className="flex flex-col gap-6">
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            {children}
          </FieldGroup>

          <div className="flex justify-end gap-2">
            <Button variant="outline" asChild>
              <Link href={cancelHref}>Cancel</Link>
            </Button>
            <Button type="submit" disabled={disabled}>
              {pending ? <Spinner /> : null}
              {submitLabel}
            </Button>
          </div>
        </Form>
      </CardContent>
    </Card>
  )
}

const emptyUser: CreateUserValues = {
  name: "",
  username: "",
  designation: "",
  phone: "",
  password: "",
  password_confirmation: "",
}

/**
 * New staff account. The backend assigns the employee id; the account starts active with
 * no permissions and must replace the initial password on first sign-in. On success the
 * new user's page opens to assign permissions.
 */
export function CreateUserForm() {
  const router = useRouter()
  const createUser = useCreateUser()
  const form = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: emptyUser,
  })

  function onSubmit(values: CreateUserValues) {
    if (createUser.isPending || createUser.isSuccess) {
      return
    }
    createUser.mutate(values, {
      onSuccess: (user) => {
        toast.success(`User ${user.username} created (${user.employee_id})`)
        router.push(`/user-management/users/${user.id}`)
      },
      onError: (error) => {
        if (!applyServerErrors(error, form.setError)) {
          toast.error(errorMessage(error, userErrorMessages))
        }
      },
    })
  }

  return (
    <FormProvider {...form}>
      <UserFormLayout
        onSubmit={form.handleSubmit(onSubmit)}
        cancelHref="/user-management/users"
        submitLabel="Create user"
        pending={createUser.isPending}
        disabled={createUser.isPending || createUser.isSuccess}
      >
        <TextControl name="name" label="Name" required />
        <TextControl name="username" label="Username" required />
        <DesignationAndPhoneFields />
        <PasswordFields />
      </UserFormLayout>
    </FormProvider>
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
 * Same form as a new user. Employee ID and username are shown but never change, and the
 * password is reset separately. Sends just what changed; the backend audits old and new values.
 */
export function EditUserForm({ user }: { user: User }) {
  const router = useRouter()
  const updateUser = useUpdateUser()
  const form = useForm<UpdateUserValues>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: profileValues(user),
  })
  const detailHref = `/user-management/users/${user.id}`

  function onSubmit(values: UpdateUserValues) {
    if (updateUser.isPending || updateUser.isSuccess) {
      return
    }
    const changes = pickDirty(values, form.formState.dirtyFields)
    if (Object.keys(changes).length === 0) {
      router.push(detailHref)
      return
    }
    updateUser.mutate(
      { id: user.id, changes },
      {
        onSuccess: () => {
          toast.success("User saved")
          router.push(detailHref)
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
    <FormProvider {...form}>
      <UserFormLayout
        onSubmit={form.handleSubmit(onSubmit)}
        cancelHref={detailHref}
        submitLabel="Save"
        pending={updateUser.isPending}
        disabled={updateUser.isPending || updateUser.isSuccess}
      >
        <ReadonlyField
          id="employee_id"
          label="Employee ID"
          value={user.employee_id}
        />
        <TextControl name="name" label="Name" required />
        <ReadonlyField
          id="username"
          label="Username"
          value={user.username}
          description="Used to sign in; cannot be changed."
        />
        <DesignationAndPhoneFields />
      </UserFormLayout>
    </FormProvider>
  )
}
