"use client"

import { PlusIcon, XIcon } from "lucide-react"
import { useState } from "react"
import { flushSync } from "react-dom"
import { useController, useFormContext, useWatch } from "react-hook-form"

import { AutocompleteInput } from "@/components/autocomplete-input"
import { focusNextField } from "@/components/form"
import { ReadonlyInput } from "@/components/readonly-input"
import { RequiredMark } from "@/components/required-mark"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { lookupEmptyText, useLookupTerm } from "@/hooks/use-lookup-term"
import {
  CheckboxControl,
  TextControl,
} from "@/modules/blood-bank/cases/components/case-form-controls"
import type { CaseCreateValues } from "@/modules/blood-bank/cases/schemas"
import { useDoctorLookup } from "@/modules/shared/doctor/queries"
import type { Doctor } from "@/modules/shared/doctor/types"
import { useStaffLookup } from "@/modules/shared/staff/queries"
import type { Staff } from "@/modules/shared/staff/types"

const DOCTOR = "billing.referral.doctor_id"
const SECOND_DOCTOR = "billing.referral.second_doctor_id"
const STAFF = "billing.referral.referred_by_staff_id"

/**
 * Who sent the patient. Doctors and staff are looked up; only their ids are sent, the
 * other details are shown for checking.
 */
export function CaseReferralFields() {
  const { control, getValues, setValue, clearErrors } =
    useFormContext<CaseCreateValues>()
  const isSelfReferral = useWatch({
    control,
    name: "billing.referral.is_self_referral",
  })
  const [showSecond, setShowSecond] = useState(
    () => getValues(SECOND_DOCTOR) !== undefined
  )

  function addSecond() {
    flushSync(() => setShowSecond(true))
    document.getElementById(SECOND_DOCTOR)?.focus()
  }

  function removeSecond() {
    setValue(SECOND_DOCTOR, undefined)
    clearErrors(SECOND_DOCTOR)
    setShowSecond(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <CheckboxControl
        name="billing.referral.is_self_referral"
        label="Self referral"
        onCheckedChange={(checked) => {
          // The backend rejects a doctor on a self referral.
          if (checked) {
            setValue(DOCTOR, undefined)
            clearErrors(DOCTOR)
          }
        }}
      />
      <DoctorFields
        // Remounting clears the typed code and name when self referral is toggled.
        key={isSelfReferral ? "self" : "doctor"}
        name={DOCTOR}
        title="Referring doctor"
        disabled={isSelfReferral}
      >
        <TextControl
          name="billing.referral.remark"
          label="Remarks"
          className="sm:col-span-4"
        />
      </DoctorFields>
      {showSecond ? (
        <DoctorFields
          name={SECOND_DOCTOR}
          title="Second doctor"
          onRemove={removeSecond}
        />
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={addSecond}
        >
          <PlusIcon data-icon="inline-start" />
          Second ref
        </Button>
      )}
      <StaffFields />
    </div>
  )
}

function doctorItem(doctor: Doctor) {
  return (
    <div className="flex flex-col">
      <span>
        <span className="font-medium">{doctor.code}</span> · {doctor.name}
      </span>
      {doctor.degree ? (
        <span className="text-xs text-muted-foreground">{doctor.degree}</span>
      ) : null}
    </div>
  )
}

/** Code and name both search; picking fills the rest read-only. */
function DoctorFields({
  name,
  title,
  disabled = false,
  onRemove,
  children,
}: {
  name: typeof DOCTOR | typeof SECOND_DOCTOR
  title: string
  disabled?: boolean
  onRemove?: () => void
  /** Extra fields at the end of the grid. */
  children?: React.ReactNode
}) {
  const { control } = useFormContext<CaseCreateValues>()
  // The referring doctor is needed unless self referral; the second one is optional.
  const required = !disabled && !onRemove
  const {
    field: { ref: inputRef, onChange, onBlur },
    fieldState,
  } = useController({ control, name })
  const [selected, setSelected] = useState<Doctor | null>(null)
  const [code, setCode] = useState("")
  const [doctorName, setDoctorName] = useState("")
  // Code and name share one term: the last edited of the two.
  const lookupTerm = useLookupTerm()
  const lookup = useDoctorLookup(lookupTerm.search)
  const nameId = `${name}.name`

  const listProps = {
    items: lookup.data,
    loading: lookupTerm.waiting || lookup.isFetching,
    getKey: (doctor: Doctor) => String(doctor.id),
    renderItem: doctorItem,
    emptyText: lookupEmptyText(
      { tooShort: lookupTerm.tooShort, isError: lookup.isError },
      "No doctor found."
    ),
    disabled,
    onSelect: pick,
  }

  function edit(next: { code: string; name: string }, typed: string) {
    setCode(next.code)
    setDoctorName(next.name)
    lookupTerm.setTerm(typed)
    if (selected) {
      setSelected(null)
      onChange(undefined)
    }
  }

  function pick(doctor: Doctor) {
    setSelected(doctor)
    setCode(doctor.code)
    setDoctorName(doctor.name)
    lookupTerm.setTerm("")
    onChange(doctor.id)
    // Degree, address and contact are read-only: on to the next editable field.
    const nameInput = document.getElementById(nameId)
    if (nameInput) {
      focusNextField(nameInput)
    }
  }

  return (
    <div
      role="group"
      aria-label={title}
      className="grid gap-3 rounded-lg border p-3 sm:grid-cols-6"
    >
      <div className="flex min-h-7 items-center justify-between sm:col-span-6">
        <p className="text-sm font-medium">{title}</p>
        {onRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove ${title.toLowerCase()}`}
            onClick={onRemove}
          >
            <XIcon />
          </Button>
        ) : null}
      </div>
      <Field data-invalid={fieldState.invalid} className="sm:col-span-2">
        <FieldLabel htmlFor={name}>
          Doctor code
          {required ? <RequiredMark /> : null}
        </FieldLabel>
        <AutocompleteInput
          {...listProps}
          id={name}
          ref={inputRef}
          value={code}
          onValueChange={(text) =>
            edit({ code: text, name: selected ? "" : doctorName }, text)
          }
          onBlur={onBlur}
          aria-invalid={fieldState.invalid}
        />
        <FieldError errors={[fieldState.error]} />
      </Field>
      <Field className="sm:col-span-4">
        <FieldLabel htmlFor={nameId}>
          Doctor name
          {required ? <RequiredMark /> : null}
        </FieldLabel>
        <AutocompleteInput
          {...listProps}
          id={nameId}
          value={doctorName}
          onValueChange={(text) =>
            edit({ code: selected ? "" : code, name: text }, text)
          }
          aria-invalid={fieldState.invalid}
        />
      </Field>
      <Field className="sm:col-span-2">
        <FieldLabel htmlFor={`${name}.degree`}>Degree</FieldLabel>
        <ReadonlyInput id={`${name}.degree`} value={selected?.degree} />
      </Field>
      <Field className="sm:col-span-4">
        <FieldLabel htmlFor={`${name}.address`}>Address</FieldLabel>
        <ReadonlyInput id={`${name}.address`} value={selected?.address} />
      </Field>
      <Field className="sm:col-span-2">
        <FieldLabel htmlFor={`${name}.phone`}>Contact no</FieldLabel>
        <ReadonlyInput id={`${name}.phone`} value={selected?.phone} />
      </Field>
      {children}
    </div>
  )
}

function staffItem(staff: Staff) {
  return (
    <div className="flex flex-col">
      <span>
        <span className="font-medium">{staff.employee_id}</span> · {staff.name}
      </span>
      {staff.designation ? (
        <span className="text-xs text-muted-foreground">
          {staff.designation}
        </span>
      ) : null}
    </div>
  )
}

/** Staff member who brought the patient (optional): search by code, the name is filled in. */
function StaffFields() {
  const { control } = useFormContext<CaseCreateValues>()
  const {
    field: { ref: inputRef, onChange, onBlur },
    fieldState,
  } = useController({ control, name: STAFF })
  const [selected, setSelected] = useState<Staff | null>(null)
  const [code, setCode] = useState("")
  const lookupTerm = useLookupTerm()
  const lookup = useStaffLookup(lookupTerm.search)

  return (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor={STAFF}>Referred by staff</FieldLabel>
      <div className="flex gap-2">
        <AutocompleteInput
          id={STAFF}
          ref={inputRef}
          className="w-32 shrink-0"
          listClassName="w-80"
          placeholder="Code"
          value={code}
          onValueChange={(text) => {
            setCode(text)
            lookupTerm.setTerm(text)
            if (selected) {
              setSelected(null)
              onChange(undefined)
            }
          }}
          onBlur={onBlur}
          items={lookup.data}
          loading={lookupTerm.waiting || lookup.isFetching}
          getKey={(staff) => String(staff.id)}
          renderItem={staffItem}
          emptyText={lookupEmptyText(
            { tooShort: lookupTerm.tooShort, isError: lookup.isError },
            "No staff found."
          )}
          onSelect={(staff) => {
            setSelected(staff)
            setCode(staff.employee_id)
            lookupTerm.setTerm("")
            onChange(staff.id)
          }}
          aria-invalid={fieldState.invalid}
        />
        <ReadonlyInput
          aria-label="Staff name"
          className="min-w-0 flex-1"
          value={
            selected
              ? [selected.name, selected.designation]
                  .filter(Boolean)
                  .join(" · ")
              : null
          }
        />
      </div>
      <FieldError errors={[fieldState.error]} />
    </Field>
  )
}
