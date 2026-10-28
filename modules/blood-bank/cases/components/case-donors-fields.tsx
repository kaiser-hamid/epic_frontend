"use client"

import { Trash2Icon, UserPlusIcon, UserSearchIcon } from "lucide-react"
import { Controller, useFieldArray, useFormContext } from "react-hook-form"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import {
  CheckboxControl,
  EnumControl,
  NumberControl,
  TextControl,
} from "@/modules/blood-bank/cases/components/case-form-controls"
import {
  DonorKind,
  emptyNewDonor,
  type CaseCreateValues,
  type CaseDonorValues,
} from "@/modules/blood-bank/cases/schemas"
import { DonorCombobox } from "@/modules/blood-bank/donors/components/donor-combobox"
import { BloodBankPermission } from "@/modules/blood-bank/permissions"
import { bloodGroupLabels, genderLabels } from "@/modules/shared/patient/enums"
import { useCan } from "@/modules/shared/rbac/use-can"

/** Donors the patient brought (optional), numbered in this order. New donors are registered with the case. */
export function CaseDonorsFields() {
  const { control, formState } = useFormContext<CaseCreateValues>()
  const donors = useFieldArray({ control, name: "donors" })
  const donorsError = formState.errors.donors
  const canSearch = useCan(BloodBankPermission.DonorView)

  return (
    <div className="flex flex-col gap-4">
      {donors.fields.length === 0 ? (
        <FieldDescription>No donors added.</FieldDescription>
      ) : null}
      {donors.fields.map((entry, index) => (
        <div
          key={entry.id}
          className="flex flex-col gap-4 rounded-lg border p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">
              Donor {index + 1}
              <span className="font-normal text-muted-foreground">
                {entry.kind === DonorKind.Existing ? " · returning" : " · new"}
              </span>
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove donor ${index + 1}`}
              onClick={() => donors.remove(index)}
            >
              <Trash2Icon />
            </Button>
          </div>

          {entry.kind === DonorKind.Existing ? (
            <Controller
              name={`donors.${index}.donor_id`}
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Donor</FieldLabel>
                  <DonorCombobox
                    id={field.name}
                    value={field.value}
                    onChange={(donorId) => field.onChange(donorId ?? undefined)}
                    invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <TextControl
                name={`donors.${index}.donor.name`}
                label="Name"
                className="sm:col-span-2"
              />
              <NumberControl
                name={`donors.${index}.donor.age`}
                label="Age (years)"
                min={1}
                max={120}
              />
              <TextControl
                name={`donors.${index}.donor.date_of_birth`}
                label="Date of birth"
                type="date"
              />
              <EnumControl
                name={`donors.${index}.donor.gender`}
                label="Gender"
                labels={genderLabels}
                optional
              />
              <EnumControl
                name={`donors.${index}.donor.blood_group`}
                label="Blood group"
                labels={bloodGroupLabels}
                optional
              />
              <TextControl
                name={`donors.${index}.donor.phone`}
                label="Phone"
                type="tel"
              />
              <TextControl
                name={`donors.${index}.donor.national_id`}
                label="National ID"
              />
              <TextControl
                name={`donors.${index}.donor.address`}
                label="Address"
                className="sm:col-span-2 lg:col-span-4"
              />
              <CheckboxControl
                name={`donors.${index}.donor.is_regular_volunteer`}
                label="Regular volunteer"
                className="sm:col-span-2 lg:col-span-4"
              />
            </div>
          )}
        </div>
      ))}
      <FieldError errors={[donorsError?.root ?? donorsError]} />
      <div className="flex flex-wrap gap-2">
        {canSearch ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              donors.append({ kind: DonorKind.Existing } as CaseDonorValues)
            }
          >
            <UserSearchIcon data-icon="inline-start" />
            Add returning donor
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            donors.append({ kind: DonorKind.New, donor: emptyNewDonor })
          }
        >
          <UserPlusIcon data-icon="inline-start" />
          Add new donor
        </Button>
      </div>
    </div>
  )
}
