"use client"

import { useFormContext, useFormState, useWatch } from "react-hook-form"

import { focusNextField } from "@/components/form"
import { FieldDescription, FieldError } from "@/components/ui/field"
import {
  AgeControl,
  DateControl,
  EnumControl,
  PhoneControl,
  TextControl,
} from "@/components/form-controls"
import { LookupMatchSelect, usePhoneLookup } from "@/components/phone-lookup"
import {
  emptyNewPatient,
  patientFormValues,
  type InvoiceValues,
} from "@/modules/shared/billing/invoices/schemas"
import {
  bloodGroupLabels,
  genderLabels,
  maritalStatusLabels,
  patientTitleLabels,
} from "@/modules/shared/patient/enums"
import { useFindPatientsByPhone } from "@/modules/shared/patient/queries"
import type { Patient } from "@/modules/shared/patient/types"
import { SharedPermission } from "@/modules/shared/rbac/permissions"
import { useCan } from "@/modules/shared/rbac/use-can"
import { formatPatientAge } from "@/modules/shared/patient/format"

const PHONE = "patient.phone"

function describePatient(patient: Patient) {
  return {
    title: `${patient.patient_no} · ${patient.name}`,
    detail: [
      formatPatientAge(patient),
      patient.gender ? genderLabels[patient.gender] : null,
      patient.blood_group ? bloodGroupLabels[patient.blood_group] : null,
    ]
      .filter(Boolean)
      .join(" · "),
  }
}

/**
 * Contact no first: patients registered with it (one phone may serve a whole family) are
 * offered in a select, "New patient" by default. A picked patient fills the section
 * read-only and is sent as `patient_id`; otherwise the fields register a new patient.
 */
export function InvoicePatientFields() {
  const { control, getValues, setValue, clearErrors, getFieldState } =
    useFormContext<InvoiceValues>()
  const patientId = useWatch({ control, name: "patient_id" })
  const formState = useFormState({ control, name: "patient_id" })
  // Finding a returning patient needs the patient search.
  const canLookup = useCan(SharedPermission.PatientView)
  const findPatients = useFindPatientsByPhone()
  // A family often shares one number, so even a single match is offered, never auto-picked.
  const lookup = usePhoneLookup(findPatients, {
    enabled: canLookup,
    canAutoPick: () => false,
  })
  const isLinked = patientId !== undefined
  const patientIdError = getFieldState("patient_id", formState).error

  /** Fills the section from a picked patient, or empties it for a new one. */
  function link(patient: Patient | null) {
    setValue("patient_id", patient?.id)
    setValue(
      "patient",
      patient
        ? patientFormValues(patient)
        : { ...emptyNewPatient, phone: getValues(PHONE) }
    )
    clearErrors(["patient_id", "patient"])
  }

  async function onPhoneCommit(
    phone: string,
    enterFrom: HTMLInputElement | null
  ) {
    await lookup.lookup(phone)
    // On to the match select when there are matches, else the new patient's fields.
    if (enterFrom) {
      focusNextField(enterFrom)
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-6">
      <PhoneControl
        name={PHONE}
        label="Contact no"
        className="sm:col-span-3"
        // Back to "New patient" in the select to change the number.
        disabled={isLinked}
        pending={lookup.pending}
        onCommit={onPhoneCommit}
        onEdit={lookup.forget}
      />
      <div className="flex flex-col justify-end gap-1 sm:col-span-3">
        {lookup.matches.length > 0 ? (
          <LookupMatchSelect
            id="patient_match"
            matches={lookup.matches}
            noun="patient"
            describe={describePatient}
            value={patientId}
            onChange={link}
          />
        ) : canLookup ? (
          <FieldDescription className="sm:pb-1.5">
            Patients registered with this number are offered to pick from.
          </FieldDescription>
        ) : null}
        <FieldError errors={[patientIdError]} />
      </div>

      <EnumControl
        name="patient.title"
        label="Title"
        labels={patientTitleLabels}
        optional
        className="sm:col-span-2"
        disabled={isLinked}
      />
      <TextControl
        name="patient.name"
        label="Name"
        required
        className="sm:col-span-4"
        disabled={isLinked}
      />
      <TextControl
        name="patient.address"
        label="Address"
        className="sm:col-span-6"
        disabled={isLinked}
      />
      <AgeControl
        required
        names={{
          years: "patient.age_years",
          months: "patient.age_months",
          days: "patient.age_days",
        }}
        dobName="patient.date_of_birth"
        className="sm:col-span-3"
        disabled={isLinked}
      />
      <DateControl
        name="patient.date_of_birth"
        label="Date of birth"
        description="Age and date of birth fill each other."
        ageNames={{
          years: "patient.age_years",
          months: "patient.age_months",
          days: "patient.age_days",
        }}
        className="sm:col-span-3"
        disabled={isLinked}
      />
      <EnumControl
        name="patient.gender"
        label="Gender"
        labels={genderLabels}
        optional
        className="sm:col-span-2"
        disabled={isLinked}
      />
      <EnumControl
        name="patient.marital_status"
        label="Marital status"
        labels={maritalStatusLabels}
        optional
        className="sm:col-span-2"
        disabled={isLinked}
      />
      <EnumControl
        name="patient.blood_group"
        label="Blood group"
        labels={bloodGroupLabels}
        optional
        className="sm:col-span-2"
        disabled={isLinked}
      />
      <TextControl
        name="patient.national_id"
        label="National ID"
        className="sm:col-span-3"
        disabled={isLinked}
      />
    </div>
  )
}
