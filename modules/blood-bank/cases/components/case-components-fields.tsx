"use client"

import { Controller, useFormContext } from "react-hook-form"

import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useComponentTypes } from "@/modules/blood-bank/component-types/queries"
import type { CaseCreateValues } from "@/modules/blood-bank/cases/schemas"

const NONE = "none"
const ID = "components.0.component_type_id"

/**
 * Requested blood component (optional). One for now, sent as a one-line `components`
 * array; the backend already takes several.
 */
export function RequestedComponentControl({
  className,
}: {
  className?: string
}) {
  const { control, formState } = useFormContext<CaseCreateValues>()
  const componentTypes = useComponentTypes()
  // Server errors land on the line ("not an active component type").
  const typeError = formState.errors.components?.[0]?.component_type_id

  function placeholder() {
    if (componentTypes.isPending) {
      return "Loading…"
    }
    return componentTypes.isError
      ? "Could not load component types."
      : "Select component"
  }

  return (
    <Controller
      name="components"
      control={control}
      render={({ field }) => {
        const line = field.value[0]
        return (
          <Field data-invalid={typeError !== undefined} className={className}>
            <FieldLabel htmlFor={ID}>Requested components</FieldLabel>
            <Select
              value={line ? String(line.component_type_id) : ""}
              onValueChange={(next) =>
                field.onChange(
                  next === NONE ? [] : [{ component_type_id: Number(next) }]
                )
              }
              disabled={!componentTypes.isSuccess}
            >
              <SelectTrigger
                id={ID}
                ref={field.ref}
                className="w-full"
                aria-invalid={typeError !== undefined}
                onBlur={field.onBlur}
              >
                <SelectValue placeholder={placeholder()} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE} className="text-muted-foreground">
                  None
                </SelectItem>
                {componentTypes.data?.map((type) => (
                  <SelectItem key={type.id} value={String(type.id)}>
                    {type.code} – {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={[typeError]} />
          </Field>
        )
      }}
    />
  )
}
