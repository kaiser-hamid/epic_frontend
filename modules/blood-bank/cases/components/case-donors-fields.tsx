"use client"

import { Trash2Icon } from "lucide-react"
import { useRef, useState } from "react"
import { flushSync } from "react-dom"
import { useFormContext, useFormState, useWatch } from "react-hook-form"

import { focusNextField } from "@/components/form"
import { Button } from "@/components/ui/button"
import { FieldDescription, FieldError } from "@/components/ui/field"
import {
  DateControl,
  EnumControl,
  NumberControl,
  TextControl,
  YesNoControl,
} from "@/components/form-controls"
import {
  focusPast,
  LinkedRecord,
  PhoneLookupControl,
} from "@/components/phone-lookup"
import {
  donorFormValues,
  emptyNewDonor,
  type DonorsFormValues,
} from "@/modules/blood-bank/cases/schemas"
import { useDonorPhoneLookup } from "@/modules/blood-bank/donors/queries"
import type { Donor } from "@/modules/blood-bank/donors/types"
import { religionLabels } from "@/modules/blood-bank/enums"
import {
  bloodGroupLabels,
  genderLabels,
  maritalStatusLabels,
} from "@/modules/shared/patient/enums"
import { formatAge } from "@/modules/shared/patient/format"

function describeDonor(donor: Donor) {
  return {
    title: `${donor.donor_no} · ${donor.name}`,
    detail: [
      donor.blood_group ? bloodGroupLabels[donor.blood_group] : null,
      formatAge(donor.age),
      donor.gender ? genderLabels[donor.gender] : null,
    ]
      .filter(Boolean)
      .join(" · "),
  }
}

/**
 * Mobile number first: Enter lists the donors registered with it ("New donor" first; no
 * match goes straight on). A picked donor fills the entry read-only and is sent as
 * `donor_id`; otherwise the fields register a new donor.
 *
 * Works in any form whose values hold `donors: CaseDonorValues[]` at the same paths (Add
 * donor). `blockedReason` keeps a found donor from being picked (e.g.
 * "Already on this case"); without `remove` there is no remove button.
 */
export function CaseDonorEntry({
  index,
  title,
  canLookup,
  remove,
  blockedReason,
}: {
  index: number
  title: string
  canLookup: boolean
  remove?: { disabled: boolean; onRemove: () => void }
  blockedReason?: (donor: Donor) => string | null
}) {
  const { control, getValues, setValue, clearErrors, getFieldState } =
    useFormContext<DonorsFormValues>()
  const phonePath = `donors.${index}.donor.phone` as const
  const donorId = useWatch({ control, name: `donors.${index}.donor_id` })
  const formState = useFormState({ control, name: `donors.${index}.donor_id` })
  const [linked, setLinked] = useState<Donor | null>(null)
  const sectionRef = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState("")
  const lookup = useDonorPhoneLookup(search)
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
  }

  function pick(donor: Donor | null) {
    link(donor)
    const section = sectionRef.current
    if (donor && section) {
      // The entry is now locked: past it (to the next field, else Save).
      focusPast(section)
    } else {
      // On to the new donor's fields.
      const phoneInput = document.getElementById(phonePath)
      if (phoneInput) {
        focusNextField(phoneInput)
      }
    }
  }

  function unlink() {
    link(null)
    document.getElementById(phonePath)?.focus()
  }

  return (
    <div ref={sectionRef} className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">
          {title}
          <span className="font-normal text-muted-foreground">
            {isLinked ? " · returning" : " · new"}
          </span>
        </p>
        {remove ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Remove ${title.toLowerCase()}`}
            disabled={remove.disabled}
            onClick={remove.onRemove}
          >
            <Trash2Icon />
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PhoneLookupControl
          name={phonePath}
          disabled={isLinked}
          searchEnabled={canLookup}
          onSearch={(phone) =>
            phone === search ? void lookup.refetch() : setSearch(phone)
          }
          matches={lookup.data}
          loading={lookup.isFetching && !lookup.data}
          error={lookup.isError}
          noun="donor"
          describe={describeDonor}
          blockedReason={blockedReason}
          onPick={pick}
        />
        <div className="flex flex-col justify-end gap-1 lg:col-span-3">
          {isLinked ? (
            <LinkedRecord
              recordNo={linked?.donor_no ?? `#${donorId}`}
              kind="Returning donor"
              onUnlink={unlink}
            />
          ) : canLookup ? (
            <FieldDescription className="lg:pb-1.5">
              Press Enter on the number to find a returning donor.
            </FieldDescription>
          ) : null}
          <FieldError errors={[donorIdError]} />
        </div>

        <TextControl
          name={`donors.${index}.donor.name`}
          label="Name"
          required
          className="sm:col-span-2"
          disabled={isLinked}
        />
        <TextControl
          name={`donors.${index}.donor.father_name`}
          label="Father's name"
          className="sm:col-span-2"
          disabled={isLinked}
        />
        <NumberControl
          name={`donors.${index}.donor.age`}
          label="Age (years)"
          required
          max={120}
          dobName={`donors.${index}.donor.date_of_birth`}
          disabled={isLinked}
        />
        <DateControl
          name={`donors.${index}.donor.date_of_birth`}
          label="Date of birth"
          ageNames={{ years: `donors.${index}.donor.age` }}
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
          name={`donors.${index}.donor.religion`}
          label="Religion"
          labels={religionLabels}
          optional
          disabled={isLinked}
        />
        <EnumControl
          name={`donors.${index}.donor.marital_status`}
          label="Marital status"
          labels={maritalStatusLabels}
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
          name={`donors.${index}.donor.occupation`}
          label="Occupation"
          className="sm:col-span-2"
          disabled={isLinked}
        />
        <TextControl
          name={`donors.${index}.donor.address`}
          label="Address"
          className="sm:col-span-2"
          disabled={isLinked}
        />
        <YesNoControl
          name={`donors.${index}.donor.is_regular_volunteer`}
          label="Would you like to be a regular voluntary donor?"
          className="sm:col-span-2 lg:col-span-4"
          disabled={isLinked}
        />
      </div>
    </div>
  )
}
