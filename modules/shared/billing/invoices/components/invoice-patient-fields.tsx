"use client"

import { useState } from "react"
import { flushSync } from "react-dom"
import { useFormContext, useFormState, useWatch } from "react-hook-form"

import { focusNextField } from "@/components/form"
import { FieldError } from "@/components/ui/field"
import {
  AgeControl,
  DateControl,
  EnumControl,
  TextControl,
} from "@/components/form-controls"
import { LinkedRecord, PhoneLookupControl } from "@/components/phone-lookup"
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
import { usePatientPhoneLookup } from "@/modules/shared/patient/queries"
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
 * Contact no first: Enter looks up the patients registered with it (one phone may serve a
 * whole family) and lists them under the field, "New patient" first. A picked patient fills
 * the section read-only and is sent as `patient_id`; otherwise the fields register a new
 * patient.
 */
export function InvoicePatientFields() {
  const { control, getValues, setValue, clearErrors, getFieldState } =
    useFormContext<InvoiceValues>()
  const patientId = useWatch({ control, name: "patient_id" })
  const formState = useFormState({ control, name: "patient_id" })
  // Finding a returning patient needs the patient search; without it Enter just moves on.
  const canLookup = useCan(SharedPermission.PatientView)
  const [search, setSearch] = useState("")
  const lookup = usePatientPhoneLookup(search)
  const [linked, setLinked] = useState<Patient | null>(null)
  const isLinked = patientId !== undefined
  const patientIdError = getFieldState("patient_id", formState).error

  /** Fills the section from a picked patient, or empties it for a new one; rendered at once. */
  function link(patient: Patient | null) {
    flushSync(() => {
      setLinked(patient)
      setValue("patient_id", patient?.id)
      setValue(
        "patient",
        patient
          ? patientFormValues(patient)
          : { ...emptyNewPatient, phone: getValues(PHONE) }
      )
      clearErrors(["patient_id", "patient"])
    })
  }

  function pick(patient: Patient | null) {
    link(patient)
    // On to the new patient's fields, or past the section a picked patient locked.
    const phoneInput = document.getElementById(PHONE)
    if (phoneInput) {
      focusNextField(phoneInput)
    }
  }

  function unlink() {
    link(null)
    document.getElementById(PHONE)?.focus()
  }

  return (
    <div className="grid gap-4 sm:grid-cols-6">
      <PhoneLookupControl
        name={PHONE}
        className="sm:col-span-3"
        // "Change" beside the linked patient frees the number again.
        disabled={isLinked}
        searchEnabled={canLookup}
        onSearch={(phone) =>
          phone === search ? void lookup.refetch() : setSearch(phone)
        }
        matches={lookup.data}
        loading={lookup.isFetching && !lookup.data}
        error={lookup.isError}
        noun="patient"
        describe={describePatient}
        onPick={pick}
      />
      <div className="flex flex-col justify-end gap-1 sm:col-span-3">
        {isLinked ? (
          <LinkedRecord
            recordNo={linked?.patient_no ?? `#${patientId}`}
            kind="Returning patient"
            onUnlink={unlink}
          />
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
