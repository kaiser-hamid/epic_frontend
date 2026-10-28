"use client"

import { Controller, useFormContext, useWatch } from "react-hook-form"

import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  EnumControl,
  NumberControl,
  TextControl,
} from "@/modules/blood-bank/cases/components/case-form-controls"
import {
  emptyNewPatient,
  PatientMode,
  type CaseCreateValues,
} from "@/modules/blood-bank/cases/schemas"
import { PatientCombobox } from "@/modules/shared/patient/components/patient-combobox"
import {
  bloodGroupLabels,
  genderLabels,
  maritalStatusLabels,
  patientTitleLabels,
} from "@/modules/shared/patient/enums"
import { SharedPermission } from "@/modules/shared/rbac/permissions"
import { useCan } from "@/modules/shared/rbac/use-can"

/** New patient (registered with the case) or a returning one (`billing.patient_id`). */
export function CasePatientFields() {
  const { control, setValue, clearErrors } = useFormContext<CaseCreateValues>()
  const mode = useWatch({ control, name: "patient_mode" })
  // Finding a returning patient needs the patient search.
  const canSearch = useCan(SharedPermission.PatientView)

  function switchMode(next: PatientMode) {
    // Reset the hidden side so it neither blocks submit nor gets sent.
    setValue("patient_mode", next)
    setValue("billing.patient_id", undefined)
    setValue("billing.patient", emptyNewPatient)
    clearErrors(["billing.patient_id", "billing.patient"])
  }

  return (
    <div className="flex flex-col gap-5">
      {canSearch ? (
        <Tabs
          value={mode}
          onValueChange={(value) => switchMode(value as PatientMode)}
        >
          <TabsList>
            <TabsTrigger value={PatientMode.New}>New patient</TabsTrigger>
            <TabsTrigger value={PatientMode.Existing}>
              Returning patient
            </TabsTrigger>
          </TabsList>
        </Tabs>
      ) : null}

      {mode === PatientMode.Existing ? (
        <Controller
          name="billing.patient_id"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="billing.patient_id">Patient</FieldLabel>
              <PatientCombobox
                id="billing.patient_id"
                value={field.value}
                onChange={(patientId) => field.onChange(patientId ?? undefined)}
                invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <EnumControl
            name="billing.patient.title"
            label="Title"
            labels={patientTitleLabels}
            optional
          />
          <TextControl
            name="billing.patient.name"
            label="Name"
            className="lg:col-span-3"
          />
          <NumberControl
            name="billing.patient.age_years"
            label="Age (years)"
            min={0}
            max={150}
          />
          <NumberControl
            name="billing.patient.age_months"
            label="Months"
            min={0}
            max={11}
          />
          <NumberControl
            name="billing.patient.age_days"
            label="Days"
            min={0}
            max={31}
          />
          <TextControl
            name="billing.patient.date_of_birth"
            label="Date of birth"
            type="date"
            description="If given, the age is calculated from it."
          />
          <EnumControl
            name="billing.patient.gender"
            label="Gender"
            labels={genderLabels}
            optional
          />
          <EnumControl
            name="billing.patient.marital_status"
            label="Marital status"
            labels={maritalStatusLabels}
            optional
          />
          <EnumControl
            name="billing.patient.blood_group"
            label="Blood group"
            labels={bloodGroupLabels}
            optional
          />
          <TextControl name="billing.patient.phone" label="Phone" type="tel" />
          <TextControl name="billing.patient.national_id" label="National ID" />
          <TextControl
            name="billing.patient.address"
            label="Address"
            className="lg:col-span-3"
          />
        </div>
      )}
    </div>
  )
}
