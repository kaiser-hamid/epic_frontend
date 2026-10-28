"use client"

import {
  Controller,
  useFormContext,
  type FieldPathByValue,
} from "react-hook-form"

import { EnumSelect } from "@/components/enum-select"
import { NumberInput } from "@/components/number-input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { CaseCreateValues } from "@/modules/blood-bank/cases/schemas"

/**
 * Labelled `Field` + `Controller` pairs for the case registration form. Must render
 * inside its `FormProvider`. The input id is the field path, so labels stay unique
 * across repeated rows.
 */

type Values = CaseCreateValues

type ControlProps = {
  label: string
  /** Keeps the label for screen readers only (repeated rows). */
  hideLabel?: boolean
  description?: string
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function TextControl({
  name,
  label,
  hideLabel,
  description,
  placeholder,
  disabled,
  className,
  type = "text",
  multiline = false,
}: ControlProps & {
  name: FieldPathByValue<Values, string>
  type?: "text" | "tel" | "date"
  multiline?: boolean
}) {
  const { control } = useFormContext<Values>()

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const inputProps = {
          id: name,
          name: field.name,
          ref: field.ref,
          value: field.value,
          onChange: field.onChange,
          onBlur: field.onBlur,
          placeholder,
          disabled,
          "aria-invalid": fieldState.invalid,
        }
        return (
          <Field data-invalid={fieldState.invalid} className={className}>
            <FieldLabel htmlFor={name} className={cn(hideLabel && "sr-only")}>
              {label}
            </FieldLabel>
            {multiline ? (
              <Textarea rows={2} {...inputProps} />
            ) : (
              <Input type={type} {...inputProps} />
            )}
            {description ? (
              <FieldDescription>{description}</FieldDescription>
            ) : null}
            <FieldError errors={[fieldState.error]} />
          </Field>
        )
      }}
    />
  )
}

export function NumberControl({
  name,
  label,
  hideLabel,
  description,
  placeholder,
  disabled,
  className,
  min,
  max,
}: ControlProps & {
  name: FieldPathByValue<Values, number | undefined>
  min?: number
  max?: number
}) {
  const { control } = useFormContext<Values>()

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className={className}>
          <FieldLabel htmlFor={name} className={cn(hideLabel && "sr-only")}>
            {label}
          </FieldLabel>
          <NumberInput
            id={name}
            name={field.name}
            ref={field.ref}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            min={min}
            max={max}
            placeholder={placeholder}
            disabled={disabled}
            aria-invalid={fieldState.invalid}
          />
          {description ? (
            <FieldDescription>{description}</FieldDescription>
          ) : null}
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}

export function EnumControl<T extends string>({
  name,
  label,
  hideLabel,
  description,
  placeholder,
  disabled,
  className,
  labels,
  optional = false,
}: ControlProps & {
  name: FieldPathByValue<Values, T | "">
  labels: Record<T, string>
  optional?: boolean
}) {
  const { control } = useFormContext<Values>()

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className={className}>
          <FieldLabel htmlFor={name} className={cn(hideLabel && "sr-only")}>
            {label}
          </FieldLabel>
          <EnumSelect
            id={name}
            // `name` only admits `T | ""` paths; TS cannot resolve that through the generic.
            value={field.value as T | ""}
            onChange={field.onChange}
            onBlur={field.onBlur}
            labels={labels}
            placeholder={placeholder}
            optional={optional}
            disabled={disabled}
            invalid={fieldState.invalid}
          />
          {description ? (
            <FieldDescription>{description}</FieldDescription>
          ) : null}
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}

export function CheckboxControl({
  name,
  label,
  disabled,
  className,
  onCheckedChange,
}: Omit<ControlProps, "hideLabel" | "placeholder" | "description"> & {
  name: FieldPathByValue<Values, boolean>
  onCheckedChange?: (checked: boolean) => void
}) {
  const { control } = useFormContext<Values>()

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field
          orientation="horizontal"
          data-invalid={fieldState.invalid}
          className={className}
        >
          <Checkbox
            id={name}
            ref={field.ref}
            checked={field.value}
            onCheckedChange={(checked) => {
              field.onChange(checked === true)
              onCheckedChange?.(checked === true)
            }}
            onBlur={field.onBlur}
            disabled={disabled}
            aria-invalid={fieldState.invalid}
          />
          <FieldLabel htmlFor={name} className="font-normal">
            {label}
          </FieldLabel>
        </Field>
      )}
    />
  )
}
