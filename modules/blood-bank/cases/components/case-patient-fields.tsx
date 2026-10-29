"use client"

import { useRef, useState } from "react"
import { flushSync } from "react-dom"
import { useFormContext, useFormState, useWatch } from "react-hook-form"

import { focusNextField } from "@/components/form"
import { FieldDescription, FieldError } from "@/components/ui/field"
import {
  AgeControl,
  DateControl,
  EnumControl,
  PhoneControl,
  TextControl,
} from "@/modules/blood-bank/cases/components/case-form-controls"
import {
  focusFirstMatch,
  focusPast,
  LinkedRecord,
  LookupMatches,
  usePhoneLookup,
} from "@/modules/blood-bank/cases/components/phone-lookup"
import {
  emptyNewPatient,
  patientFormValues,
  type CaseCreateValues,
} from "@/modules/blood-bank/cases/schemas"
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

const PHONE = "billing.patient.phone"

function describePatient(patient: Patient) {
  return {
    title: `${patient.patient_no} · ${patient.name}`,
    detail: [
      patient.age_years !== null ? `${patient.age_years}y` : null,
      patient.gender ? genderLabels[patient.gender] : null,
      patient.blood_group ? bloodGroupLabels[patient.blood_group] : null,
    ]
      .filter(Boolean)
      .join(" · "),
  }
}

/**
 * Contact no first: a returning patient found by it fills the section read-only and is
 * sent as `billing.patient_id`; otherwise the fields register a new patient.
 */
export function CasePatientFields() {
  const { control, getValues, setValue, clearErrors, getFieldState } =
    useFormContext<CaseCreateValues>()
  const patientId = useWatch({ control, name: "billing.patient_id" })
  const formState = useFormState({ control, name: "billing.patient_id" })
  const [linked, setLinked] = useState<Patient | null>(null)
  const sectionRef = useRef<HTMLDivElement>(null)
  // Finding a returning patient needs the patient search.
  const canLookup = useCan(SharedPermission.PatientView)
  const findPatients = useFindPatientsByPhone()
  const lookup = usePhoneLookup(findPatients, { enabled: canLookup })
  const isLinked = patientId !== undefined
  const patientIdError = getFieldState("billing.patient_id", formState).error

  /** Fills (or, with null, empties) the section; rendered before returning so focus can move. */
  function link(patient: Patient | null) {
    flushSync(() => {
      setLinked(patient)
      setValue("billing.patient_id", patient?.id)
      setValue(
        "billing.patient",
        patient
          ? patientFormValues(patient)
          : { ...emptyNewPatient, phone: getValues(PHONE) }
      )
      clearErrors(["billing.patient_id", "billing.patient"])
    })
    lookup.clearMatches()
  }

  async function onPhoneCommit(
    phone: string,
    enterFrom: HTMLInputElement | null
  ) {
    const result = await lookup.lookup(phone)
    const section = sectionRef.current
    if (!section) {
      return
    }
    if (result.status === "one") {
      const focused = document.activeElement
      link(result.match)
      // The phone or a field after it had focus; those are now disabled.
      if (focused && section.contains(focused)) {
        focusPast(section)
      }
    } else if (enterFrom) {
      if (result.status === "many") {
        focusFirstMatch(section)
      } else {
        focusNextField(enterFrom)
      }
    }
  }

  function unlink() {
    link(null)
    document.getElementById(PHONE)?.focus()
  }

  function registerNew() {
    lookup.clearMatches()
    const phone = document.getElementById(PHONE)
    if (phone) {
      focusNextField(phone)
    }
  }

  return (
    <div ref={sectionRef} className="grid gap-4 sm:grid-cols-6">
      <PhoneControl
        name={PHONE}
        label="Contact no"
        className="sm:col-span-3"
        disabled={isLinked}
        pending={lookup.pending}
        onCommit={onPhoneCommit}
        onEdit={lookup.forget}
      />
      <div className="flex flex-col justify-end gap-1 sm:col-span-3 sm:pb-px">
        {isLinked ? (
          <LinkedRecord
            recordNo={linked?.patient_no ?? `#${patientId}`}
            kind="Returning patient"
            onUnlink={unlink}
          />
        ) : canLookup ? (
          <FieldDescription className="sm:pb-1.5">
            A returning patient is filled in from the number.
          </FieldDescription>
        ) : null}
        <FieldError errors={[patientIdError]} />
      </div>
      {lookup.matches.length > 0 ? (
        <LookupMatches
          className="sm:col-span-6"
          matches={lookup.matches}
          noun="patient"
          describe={describePatient}
          onPick={(patient) => {
            link(patient)
            if (sectionRef.current) {
              focusPast(sectionRef.current)
            }
          }}
          onNew={registerNew}
        />
      ) : null}

      <EnumControl
        name="billing.patient.title"
        label="Title"
        labels={patientTitleLabels}
        optional
        className="sm:col-span-2"
        disabled={isLinked}
      />
      <TextControl
        name="billing.patient.name"
        label="Name"
        required
        className="sm:col-span-4"
        disabled={isLinked}
      />
      <TextControl
        name="billing.patient.address"
        label="Address"
        className="sm:col-span-6"
        disabled={isLinked}
      />
      <AgeControl
        required
        names={{
          years: "billing.patient.age_years",
          months: "billing.patient.age_months",
          days: "billing.patient.age_days",
        }}
        className="sm:col-span-3"
        disabled={isLinked}
      />
      <DateControl
        name="billing.patient.date_of_birth"
        label="Date of birth"
        description="If given, the age is calculated from it."
        className="sm:col-span-3"
        disabled={isLinked}
      />
      <EnumControl
        name="billing.patient.gender"
        label="Gender"
        labels={genderLabels}
        optional
        className="sm:col-span-2"
        disabled={isLinked}
      />
      <EnumControl
        name="billing.patient.marital_status"
        label="Marital status"
        labels={maritalStatusLabels}
        optional
        className="sm:col-span-2"
        disabled={isLinked}
      />
      <EnumControl
        name="billing.patient.blood_group"
        label="Blood group"
        labels={bloodGroupLabels}
        optional
        className="sm:col-span-2"
        disabled={isLinked}
      />
      <TextControl
        name="billing.patient.national_id"
        label="National ID"
        className="sm:col-span-3"
        disabled={isLinked}
      />
    </div>
  )
}
