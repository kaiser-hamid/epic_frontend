"use client"

import { useState } from "react"

import { AutocompleteInput } from "@/components/autocomplete-input"
import { ReadonlyInput } from "@/components/readonly-input"
import { lookupEmptyText, useLookupTerm } from "@/hooks/use-lookup-term"
import { designationLabel } from "@/modules/shared/auth/enums"
import { useStaffLookup } from "@/modules/shared/staff/queries"
import type { Staff } from "@/modules/shared/staff/types"

function staffItem(staff: Staff) {
  return (
    <div className="flex flex-col">
      <span>
        <span className="font-medium">{staff.employee_id}</span> · {staff.name}
      </span>
      {staff.designation ? (
        <span className="text-xs text-muted-foreground">
          {designationLabel(staff.designation)}
        </span>
      ) : null}
    </div>
  )
}

/**
 * Picks an active staff member (`GET /api/staff/lookup`): type the employee id or name, pick a
 * suggestion, and the name and designation are shown beside it. Only the user id is reported;
 * editing the text clears the choice. For react-hook-form, pass the field's `ref`, `onBlur`
 * and an `onChange` taking the id.
 */
export function StaffCombobox({
  id,
  value,
  onChange,
  onBlur,
  inputRef,
  invalid,
  placeholder = "Code or name",
  nameLabel = "Staff name",
}: {
  id: string
  /** The chosen user id; undefined when none. */
  value: number | undefined
  onChange: (staffId: number | undefined) => void
  onBlur?: () => void
  inputRef?: React.Ref<HTMLInputElement>
  invalid?: boolean
  placeholder?: string
  /** Accessible label of the read-only name box. */
  nameLabel?: string
}) {
  const [selected, setSelected] = useState<Staff | null>(null)
  const [text, setText] = useState("")
  const lookupTerm = useLookupTerm()
  const lookup = useStaffLookup(lookupTerm.search)
  // A value reset from outside (form reset) clears the shown choice too.
  const shown = selected !== null && selected.id === value ? selected : null

  return (
    <div className="flex gap-2">
      <AutocompleteInput
        id={id}
        ref={inputRef}
        className="w-36 shrink-0"
        listClassName="w-80"
        placeholder={placeholder}
        value={text}
        onValueChange={(next) => {
          setText(next)
          lookupTerm.setTerm(next)
          if (value !== undefined) {
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
          setText(staff.employee_id)
          lookupTerm.setTerm("")
          onChange(staff.id)
        }}
        aria-invalid={invalid}
      />
      <ReadonlyInput
        aria-label={nameLabel}
        className="min-w-0 flex-1"
        value={
          shown
            ? [shown.name, designationLabel(shown.designation)]
                .filter(Boolean)
                .join(" · ")
            : null
        }
      />
    </div>
  )
}
