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
import { Textarea } from "@/components/ui/textarea"
import type { CaseUpdateValues } from "@/modules/blood-bank/cases/schemas"
import { careTypeLabels, CareType } from "@/modules/blood-bank/enums"

/** Fields shared by the create and edit forms. Must render inside a `FormProvider`. */
export function CaseDetailsFields() {
  const { control } = useFormContext<CaseUpdateValues>()

  return (
    <>
      <Controller
        name="care_type"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="care_type">Care of</FieldLabel>
            <Select value={field.value ?? ""} onValueChange={field.onChange}>
              <SelectTrigger
                id="care_type"
                aria-invalid={fieldState.invalid}
                onBlur={field.onBlur}
              >
                <SelectValue placeholder="Select care type" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(CareType).map((careType) => (
                  <SelectItem key={careType} value={careType}>
                    {careTypeLabels[careType]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />
      <Controller
        name="transfusion_reason"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="transfusion_reason">
              Cause of transfusion
            </FieldLabel>
            <Textarea
              {...field}
              id="transfusion_reason"
              rows={2}
              aria-invalid={fieldState.invalid}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />
      <Controller
        name="reference_note"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="reference_note">Reference note</FieldLabel>
            <Textarea
              {...field}
              id="reference_note"
              rows={2}
              aria-invalid={fieldState.invalid}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />
    </>
  )
}
