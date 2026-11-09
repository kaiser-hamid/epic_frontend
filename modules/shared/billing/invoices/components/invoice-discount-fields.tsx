"use client"

import { useEffect } from "react"
import { Controller, useFormContext, useWatch } from "react-hook-form"

import { RequiredMark } from "@/components/required-mark"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { usePatientTypes } from "@/modules/shared/billing/invoices/queries"
import type { InvoiceValues } from "@/modules/shared/billing/invoices/schemas"
import { GENERAL_PATIENT_TYPE_CODE } from "@/modules/shared/billing/invoices/types"

const NO_DISCOUNT = "__none__"

/**
 * Patient type (required; "General Patient" until another is chosen) and at most one of that
 * type's discount policies. The discount itself is calculated by the server.
 */
export function InvoiceDiscountFields() {
  const { control, getValues, setValue } = useFormContext<InvoiceValues>()
  const patientTypes = usePatientTypes()
  const patientTypeId = useWatch({ control, name: "patient_type_id" })
  const policies =
    patientTypes.data?.find((type) => type.id === patientTypeId)
      ?.discount_policies ?? []

  // Every bill starts as a general patient's.
  useEffect(() => {
    const general = patientTypes.data?.find(
      (type) => type.code === GENERAL_PATIENT_TYPE_CODE
    )
    if (general && getValues("patient_type_id") === undefined) {
      setValue("patient_type_id", general.id)
    }
  }, [patientTypes.data, getValues, setValue])

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Controller
        name="patient_type_id"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>
              Patient type
              <RequiredMark />
            </FieldLabel>
            <Select
              value={field.value === undefined ? "" : String(field.value)}
              onValueChange={(next) => {
                field.onChange(Number(next))
                // A policy belongs to one patient type.
                setValue("discount_policy_id", undefined)
              }}
              disabled={patientTypes.isPending}
            >
              <SelectTrigger
                id={field.name}
                aria-invalid={fieldState.invalid}
                onBlur={field.onBlur}
              >
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {(patientTypes.data ?? []).map((type) => (
                  <SelectItem key={type.id} value={String(type.id)}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <Controller
        name="discount_policy_id"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Discount</FieldLabel>
            <Select
              value={
                field.value === undefined ? NO_DISCOUNT : String(field.value)
              }
              onValueChange={(next) =>
                field.onChange(next === NO_DISCOUNT ? undefined : Number(next))
              }
              disabled={policies.length === 0}
            >
              <SelectTrigger
                id={field.name}
                aria-invalid={fieldState.invalid}
                onBlur={field.onBlur}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_DISCOUNT}>No discount</SelectItem>
                {policies.map((policy) => (
                  <SelectItem key={policy.id} value={String(policy.id)}>
                    {policy.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>
              Applies to every test, except tests with their own discount rate.
            </FieldDescription>
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />
    </div>
  )
}
