"use client"

import { Trash2Icon, UserPlusIcon } from "lucide-react"
import { useRef, useState } from "react"
import { flushSync } from "react-dom"
import {
  useFieldArray,
  useFormContext,
  useFormState,
  useWatch,
} from "react-hook-form"

import { focusNextField } from "@/components/form"
import { Button } from "@/components/ui/button"
import { FieldDescription, FieldError } from "@/components/ui/field"
import {
  CheckboxControl,
  DateControl,
  EnumControl,
  NumberControl,
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
  donorFormValues,
  emptyCaseDonor,
  emptyNewDonor,
  type CaseCreateValues,
} from "@/modules/blood-bank/cases/schemas"
import { useFindDonorsByPhone } from "@/modules/blood-bank/donors/queries"
import type { Donor } from "@/modules/blood-bank/donors/types"
import { BloodBankPermission } from "@/modules/blood-bank/permissions"
import { bloodGroupLabels, genderLabels } from "@/modules/shared/patient/enums"
import { useCan } from "@/modules/shared/rbac/use-can"

function describeDonor(donor: Donor) {
  return {
    title: `${donor.donor_no} · ${donor.name}`,
    detail: [
      donor.blood_group ? bloodGroupLabels[donor.blood_group] : null,
      donor.age !== null ? `${donor.age}y` : null,
      donor.gender ? genderLabels[donor.gender] : null,
    ]
      .filter(Boolean)
      .join(" · "),
  }
}

/** Donors the patient brought (at least one), numbered in this order. New donors are registered with the case. */
export function CaseDonorsFields() {
  const { control, formState } = useFormContext<CaseCreateValues>()
  const donors = useFieldArray({ control, name: "donors" })
  const donorsError = formState.errors.donors
  const canLookup = useCan(BloodBankPermission.DonorView)

  return (
    <div className="flex flex-col gap-4">
      {donors.fields.map((entry, index) => (
        <CaseDonorEntry
          key={entry.id}
          index={index}
          canLookup={canLookup}
          canRemove={donors.fields.length > 1}
          onRemove={() => donors.remove(index)}
        />
      ))}
      <FieldError errors={[donorsError?.root ?? donorsError]} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() =>
          donors.append(emptyCaseDonor, {
            focusName: `donors.${donors.fields.length}.donor.phone`,
          })
        }
      >
        <UserPlusIcon data-icon="inline-start" />
        Add donor
      </Button>
    </div>
  )
}

/**
 * Mobile number first: a returning donor found by it fills the entry read-only and is sent
 * as `donor_id`; otherwise the fields register a new donor.
 */
function CaseDonorEntry({
  index,
  canLookup,
  canRemove,
  onRemove,
}: {
  index: number
  canLookup: boolean
  canRemove: boolean
  onRemove: () => void
}) {
  const { control, getValues, setValue, clearErrors, getFieldState } =
    useFormContext<CaseCreateValues>()
  const phonePath = `donors.${index}.donor.phone` as const
  const donorId = useWatch({ control, name: `donors.${index}.donor_id` })
  const formState = useFormState({ control, name: `donors.${index}.donor_id` })
  const [linked, setLinked] = useState<Donor | null>(null)
  const sectionRef = useRef<HTMLDivElement>(null)
  const findDonors = useFindDonorsByPhone()
  const lookup = usePhoneLookup(findDonors, { enabled: canLookup })
  const isLinked = donorId !== undefined
  const donorIdError = getFieldState(
    `donors.${index}.donor_id`,
    formState
  ).error

  /** Fills (or, with null, empties) the entry; rendered before returning so focus can move. */
  function link(donor: Donor | null) {
    flushSync(() => {
      setLinked(donor)
      setValue(`donors.${index}.donor_id`, donor?.id)
      setValue(
        `donors.${index}.donor`,
        donor
          ? donorFormValues(donor)
          : { ...emptyNewDonor, phone: getValues(phonePath) }
      )
      clearErrors([`donors.${index}.donor_id`, `donors.${index}.donor`])
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
    document.getElementById(phonePath)?.focus()
  }

  function registerNew() {
    lookup.clearMatches()
    const phone = document.getElementById(phonePath)
    if (phone) {
      focusNextField(phone)
    }
  }

  return (
    <div ref={sectionRef} className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">
          Donor {index + 1}
          <span className="font-normal text-muted-foreground">
            {isLinked ? " · returning" : " · new"}
          </span>
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Remove donor ${index + 1}`}
          disabled={!canRemove}
          onClick={onRemove}
        >
          <Trash2Icon />
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PhoneControl
          name={phonePath}
          label="Contact no"
          disabled={isLinked}
          pending={lookup.pending}
          onCommit={onPhoneCommit}
          onEdit={lookup.forget}
        />
        <div className="flex flex-col justify-end gap-1 lg:col-span-3 lg:pb-px">
          {isLinked ? (
            <LinkedRecord
              recordNo={linked?.donor_no ?? `#${donorId}`}
              kind="Returning donor"
              onUnlink={unlink}
            />
          ) : canLookup ? (
            <FieldDescription className="lg:pb-1.5">
              A returning donor is filled in from the number.
            </FieldDescription>
          ) : null}
          <FieldError errors={[donorIdError]} />
        </div>
        {lookup.matches.length > 0 ? (
          <LookupMatches
            className="sm:col-span-2 lg:col-span-4"
            matches={lookup.matches}
            noun="donor"
            describe={describeDonor}
            onPick={(donor) => {
              link(donor)
              if (sectionRef.current) {
                focusPast(sectionRef.current)
              }
            }}
            onNew={registerNew}
          />
        ) : null}

        <TextControl
          name={`donors.${index}.donor.name`}
          label="Name"
          required
          className="sm:col-span-2"
          disabled={isLinked}
        />
        <NumberControl
          name={`donors.${index}.donor.age`}
          label="Age (years)"
          required
          max={120}
          disabled={isLinked}
        />
        <DateControl
          name={`donors.${index}.donor.date_of_birth`}
          label="Date of birth"
          disabled={isLinked}
        />
        <EnumControl
          name={`donors.${index}.donor.gender`}
          label="Gender"
          labels={genderLabels}
          optional
          disabled={isLinked}
        />
        <EnumControl
          name={`donors.${index}.donor.blood_group`}
          label="Blood group"
          labels={bloodGroupLabels}
          optional
          disabled={isLinked}
        />
        <TextControl
          name={`donors.${index}.donor.national_id`}
          label="National ID"
          className="sm:col-span-2"
          disabled={isLinked}
        />
        <TextControl
          name={`donors.${index}.donor.address`}
          label="Address"
          className="sm:col-span-2 lg:col-span-4"
          disabled={isLinked}
        />
        <CheckboxControl
          name={`donors.${index}.donor.is_regular_volunteer`}
          label="Regular volunteer"
          className="sm:col-span-2 lg:col-span-4"
          disabled={isLinked}
        />
      </div>
    </div>
  )
}
