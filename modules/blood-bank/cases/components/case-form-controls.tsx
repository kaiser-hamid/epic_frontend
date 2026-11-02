"use client"

import {
  Controller,
  useFormContext,
  useFormState,
  type FieldPathByValue,
} from "react-hook-form"

import { ChoiceGroup } from "@/components/choice-group"
import { DateInput } from "@/components/date-input"
import { EnumSelect } from "@/components/enum-select"
import { NumberInput, toWholeNumber } from "@/components/number-input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { RequiredMark } from "@/components/required-mark"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { ageFromDob, dobFromAge } from "@/modules/blood-bank/cases/age-dob"
import type { CaseCreateValues } from "@/modules/blood-bank/cases/schemas"

/**
 * Labelled `Field` + `Controller` pairs for the case registration form. Must render
 * inside its `FormProvider`. The input id is the field path, so labels stay unique
 * across repeated rows.
 */

type Values = CaseCreateValues

type NumberPath = FieldPathByValue<Values, number | undefined>

type ControlProps = {
  label: string
  /** Keeps the label for screen readers only (repeated rows). */
  hideLabel?: boolean
  /** Adds the red asterisk; validation lives in the schema. */
  required?: boolean
  description?: string
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function TextControl({
  name,
  label,
  required,
  hideLabel,
  description,
  placeholder,
  disabled,
  className,
}: ControlProps & {
  name: FieldPathByValue<Values, string>
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
            {required ? <RequiredMark /> : null}
          </FieldLabel>
          <Input
            id={name}
            name={field.name}
            ref={field.ref}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
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

/**
 * Plain date (`YYYY-MM-DD`): typed `dd/MM/yyyy` or picked from a calendar. With `ageNames`,
 * a complete date also fills those age fields (see `age-dob.ts`).
 */
export function DateControl({
  name,
  label,
  required,
  description,
  disabled,
  className,
  ageNames,
}: Omit<ControlProps, "hideLabel" | "placeholder"> & {
  name: FieldPathByValue<Values, string>
  ageNames?: { years: NumberPath; months?: NumberPath; days?: NumberPath }
}) {
  const { control, setValue } = useFormContext<Values>()

  function fillAge(dob: string) {
    const age = ageNames ? ageFromDob(dob) : null
    if (!ageNames || !age) {
      return
    }
    const options = { shouldDirty: true, shouldValidate: true }
    setValue(ageNames.years, age.years, options)
    if (ageNames.months) {
      setValue(ageNames.months, age.months, options)
    }
    if (ageNames.days) {
      setValue(ageNames.days, age.days, options)
    }
  }

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className={className}>
          <FieldLabel htmlFor={name}>
            {label}
            {required ? <RequiredMark /> : null}
          </FieldLabel>
          <DateInput
            id={name}
            name={field.name}
            ref={field.ref}
            value={field.value}
            onChange={(next) => {
              field.onChange(next)
              fillAge(next)
            }}
            onBlur={field.onBlur}
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

export function NumberControl({
  name,
  label,
  required,
  hideLabel,
  description,
  placeholder,
  disabled,
  className,
  max,
  dobName,
}: ControlProps & {
  name: NumberPath
  max?: number
  /** Years-only age: also sets this date-of-birth field to match (see `age-dob.ts`). */
  dobName?: FieldPathByValue<Values, string>
}) {
  const { control, setValue } = useFormContext<Values>()

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className={className}>
          <FieldLabel htmlFor={name} className={cn(hideLabel && "sr-only")}>
            {label}
            {required ? <RequiredMark /> : null}
          </FieldLabel>
          <NumberInput
            id={name}
            name={field.name}
            ref={field.ref}
            value={field.value}
            onChange={(next) => {
              field.onChange(next)
              if (dobName) {
                setValue(dobName, dobFromAge({ years: next }), {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            }}
            onBlur={field.onBlur}
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

/**
 * Phone that looks up a returning record. Digits only. The lookup runs on blur and on
 * Enter (`data-enter-key="native"`: the caller moves focus once the lookup is done).
 */
export function PhoneControl({
  name,
  label,
  required,
  description,
  placeholder = "01XXXXXXXXX",
  disabled,
  className,
  pending = false,
  onCommit,
  onEdit,
}: Omit<ControlProps, "hideLabel"> & {
  name: FieldPathByValue<Values, string>
  /** Shows a spinner while the lookup runs. */
  pending?: boolean
  /** Blur or Enter. On Enter the input is passed, so focus can move on afterwards. */
  onCommit: (phone: string, enterFrom: HTMLInputElement | null) => void
  /** Each edit of the number. */
  onEdit?: () => void
}) {
  const { control } = useFormContext<Values>()

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className={className}>
          <FieldLabel htmlFor={name}>
            {label}
            {required ? <RequiredMark /> : null}
          </FieldLabel>
          <InputGroup>
            <InputGroupInput
              type="tel"
              inputMode="numeric"
              autoComplete="off"
              maxLength={20}
              data-enter-key="native"
              id={name}
              name={field.name}
              ref={field.ref}
              value={field.value}
              onChange={(event) => {
                field.onChange(event.target.value.replace(/\D/g, ""))
                onEdit?.()
              }}
              onBlur={() => {
                field.onBlur()
                onCommit(field.value, null)
              }}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.nativeEvent.isComposing &&
                  !event.altKey &&
                  !event.ctrlKey &&
                  !event.metaKey &&
                  !event.shiftKey
                ) {
                  event.preventDefault()
                  onCommit(field.value, event.currentTarget)
                }
              }}
              placeholder={placeholder}
              disabled={disabled}
              aria-invalid={fieldState.invalid}
            />
            {pending ? (
              <InputGroupAddon align="inline-end">
                <Spinner />
              </InputGroupAddon>
            ) : null}
          </InputGroup>
          {description ? (
            <FieldDescription>{description}</FieldDescription>
          ) : null}
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}

/**
 * Years, months and days side by side under one label, with one error line. With `dobName`,
 * typing years, years + months or years + months + days also sets that date of birth.
 */
export function AgeControl({
  names,
  dobName,
  label = "Age",
  required,
  disabled,
  className,
}: {
  names: { years: NumberPath; months: NumberPath; days: NumberPath }
  dobName?: FieldPathByValue<Values, string>
  label?: string
  required?: boolean
  disabled?: boolean
  className?: string
}) {
  const { control, getFieldState, getValues, setValue } =
    useFormContext<Values>()
  const formState = useFormState({
    control,
    name: [names.years, names.months, names.days],
  })
  const parts = [
    {
      key: "years",
      name: names.years,
      unit: "Y",
      unitLabel: "years",
      max: 150,
    },
    {
      key: "months",
      name: names.months,
      unit: "M",
      unitLabel: "months",
      max: 11,
    },
    { key: "days", name: names.days, unit: "D", unitLabel: "days", max: 31 },
  ] as const
  const errors = parts.map((part) => getFieldState(part.name, formState).error)

  return (
    <Field data-invalid={errors.some(Boolean)} className={className}>
      <FieldLabel htmlFor={names.years}>
        {label}
        {required ? <RequiredMark /> : null}
      </FieldLabel>
      <div className="flex gap-1.5">
        {parts.map((part) => (
          <Controller
            key={part.name}
            name={part.name}
            control={control}
            render={({ field, fieldState }) => (
              <InputGroup className="min-w-0 flex-1">
                <InputGroupInput
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={String(part.max).length}
                  id={part.name}
                  name={field.name}
                  ref={field.ref}
                  value={field.value ?? ""}
                  onChange={(event) => {
                    const next = toWholeNumber(event.target.value)
                    field.onChange(next)
                    if (dobName) {
                      const age = {
                        years: getValues(names.years),
                        months: getValues(names.months),
                        days: getValues(names.days),
                        [part.key]: next,
                      }
                      setValue(dobName, dobFromAge(age), {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  }}
                  onBlur={field.onBlur}
                  disabled={disabled}
                  aria-label={`${label} (${part.unitLabel})`}
                  aria-invalid={fieldState.invalid}
                />
                <InputGroupAddon align="inline-end">
                  {part.unit}
                </InputGroupAddon>
              </InputGroup>
            )}
          />
        ))}
      </div>
      <FieldError errors={[errors.find(Boolean)]} />
    </Field>
  )
}

export function EnumControl<T extends string>({
  name,
  label,
  required,
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
            {required ? <RequiredMark /> : null}
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

const NOT_ASKED = "not_asked"

const yesNoOptions = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: NOT_ASKED, label: "Not asked" },
] as const

/** Yes / No / Not asked for a `boolean | null` field (null = not asked). */
export function YesNoControl({
  name,
  label,
  disabled,
  className,
}: Omit<ControlProps, "hideLabel" | "placeholder" | "description"> & {
  name: FieldPathByValue<Values, boolean | null>
}) {
  const { control } = useFormContext<Values>()
  const labelId = `${name}_label`

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className={className}>
          <FieldTitle id={labelId}>{label}</FieldTitle>
          <ChoiceGroup
            id={name}
            ref={field.ref}
            value={
              field.value === true
                ? "yes"
                : field.value === false
                  ? "no"
                  : NOT_ASKED
            }
            onChange={(next) =>
              field.onChange(next === NOT_ASKED ? null : next === "yes")
            }
            onBlur={field.onBlur}
            options={yesNoOptions}
            disabled={disabled}
            invalid={fieldState.invalid}
            aria-labelledby={labelId}
          />
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
