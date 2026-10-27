"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Form } from "@/components/form"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { errorMessage } from "@/lib/api-error"
import { applyServerErrors } from "@/lib/form-errors"
import { useChangePassword, useMe } from "@/modules/shared/auth/queries"
import { safeNextPath } from "@/modules/shared/auth/safe-next-path"
import {
  changePasswordSchema,
  type ChangePasswordValues,
} from "@/modules/shared/auth/schemas"

const fields = [
  {
    name: "current_password",
    label: "Current password",
    autoComplete: "current-password",
  },
  { name: "password", label: "New password", autoComplete: "new-password" },
  {
    name: "password_confirmation",
    label: "Repeat new password",
    autoComplete: "new-password",
  },
] as const

/** Required before anything else when an admin set the password (`must_change_password`). */
export function ChangePasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: me, isPending } = useMe()
  const changePassword = useChangePassword()

  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: "",
      password: "",
      password_confirmation: "",
    },
  })

  useEffect(() => {
    if (!isPending && me === null) {
      router.replace("/login")
    }
  }, [isPending, me, router])

  function onSubmit(values: ChangePasswordValues) {
    changePassword.mutate(values, {
      onSuccess: () => {
        toast.success("Password changed. Your other sessions were signed out.")
        router.replace(safeNextPath(searchParams.get("next")))
      },
      onError: (error) => {
        if (!applyServerErrors(error, form.setError)) {
          toast.error(errorMessage(error))
        }
      },
    })
  }

  if (!me) {
    return <Skeleton className="h-48 w-full" />
  }

  return (
    <Form onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        {fields.map(({ name, label, autoComplete }) => (
          <Controller
            key={name}
            name={name}
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={name}>{label}</FieldLabel>
                <Input
                  {...field}
                  id={name}
                  type="password"
                  autoComplete={autoComplete}
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        ))}
        <Button type="submit" disabled={changePassword.isPending}>
          {changePassword.isPending ? <Spinner /> : null}
          Change password
        </Button>
      </FieldGroup>
    </Form>
  )
}
