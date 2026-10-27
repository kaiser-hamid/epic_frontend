"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Form } from "@/components/form"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { errorMessage, hasErrorCode } from "@/lib/api-error"
import { formatDateTime } from "@/lib/format"
import { applyServerErrors } from "@/lib/form-errors"
import { useLogin, useLoginBranches } from "@/modules/shared/auth/queries"
import { safeNextPath } from "@/modules/shared/auth/safe-next-path"
import { loginSchema, type LoginValues } from "@/modules/shared/auth/schemas"

const loginErrorMessages = {
  INVALID_CREDENTIALS: "Username or password is incorrect.",
  ACCOUNT_INACTIVE: "This account has been deactivated. Contact IT.",
  BRANCH_ACCESS_DENIED: "You do not have access to this branch.",
}

function loginErrorText(error: unknown): string {
  if (hasErrorCode(error, "ACCOUNT_LOCKED")) {
    const lockedUntil = error.context.locked_until
    return typeof lockedUntil === "string"
      ? `Too many failed attempts. Try again after ${formatDateTime(lockedUntil)}.`
      : "Too many failed attempts. This account is temporarily locked."
  }
  return errorMessage(error, loginErrorMessages)
}

/**
 * The branch is chosen at login and fixed for the session. Branches are looked
 * up when the username field loses focus (the endpoint is throttled).
 */
export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const loginMutation = useLogin()
  const [lookupUsername, setLookupUsername] = useState("")
  const branches = useLoginBranches(lookupUsername)

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  })

  const branchList = branches.data
  useEffect(() => {
    const only = branchList?.length === 1 ? branchList[0] : undefined
    form.resetField("branch_id")
    if (only) {
      form.setValue("branch_id", only.id)
    }
  }, [branchList, form])

  function onSubmit(values: LoginValues) {
    loginMutation.mutate(values, {
      onSuccess: (me) => {
        const next = safeNextPath(searchParams.get("next"))
        router.replace(
          me.must_change_password
            ? `/change-password?next=${encodeURIComponent(next)}`
            : next
        )
      },
      onError: (error) => {
        if (!applyServerErrors(error, form.setError)) {
          toast.error(loginErrorText(error))
        }
      },
    })
  }

  return (
    <Form onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <Controller
          name="username"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="username">Username</FieldLabel>
              <Input
                {...field}
                id="username"
                autoComplete="username"
                autoFocus
                aria-invalid={fieldState.invalid}
                onBlur={() => {
                  field.onBlur()
                  setLookupUsername(field.value.trim())
                }}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                {...field}
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          name="branch_id"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="branch_id">Branch</FieldLabel>
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(value) => field.onChange(Number(value))}
                disabled={!branchList?.length}
              >
                <SelectTrigger id="branch_id" aria-invalid={fieldState.invalid}>
                  {branches.isFetching ? <Spinner /> : null}
                  <SelectValue placeholder="Select a branch" />
                </SelectTrigger>
                <SelectContent>
                  {(branchList ?? []).map((branch) => (
                    <SelectItem key={branch.id} value={String(branch.id)}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {branchList?.length === 0 ? (
                <FieldDescription>
                  No branch is available for this username.
                </FieldDescription>
              ) : null}
              {branches.error ? (
                <FieldDescription>
                  {errorMessage(branches.error)}
                </FieldDescription>
              ) : null}
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Button type="submit" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? <Spinner /> : null}
          Sign in
        </Button>
      </FieldGroup>
    </Form>
  )
}
