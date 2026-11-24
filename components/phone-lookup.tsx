"use client"

import { BadgeCheckIcon } from "lucide-react"
import {
  useController,
  useFormContext,
  type FieldValues,
} from "react-hook-form"

import { AutocompleteInput } from "@/components/autocomplete-input"
import { focusNextField } from "@/components/form"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"

/**
 * "Type the number first" for the registration forms (bill entry, Add donor): Enter on the
 * phone field looks up the returning patients or donors registered with it. Matches are
 * listed under the field with "New …" first (a number may be shared, so no match is
 * assumed); no match moves straight on to the new record's fields. A picked record fills
 * the section read-only and shows as a `LinkedRecord` with a way back.
 */

const NEW = "new"

type MatchDescription = { title: string; detail: string }

/**
 * The phone field of a lookup section, for any `FormProvider` (`name` is the phone path).
 * The caller owns the query: `onSearch` gets the number on Enter, its results come back as
 * `matches`. `onPick` gets the picked record, or null for "New …".
 */
export function PhoneLookupControl<T extends { id: number }>({
  name,
  label = "Contact no",
  className,
  disabled,
  searchEnabled = true,
  onSearch,
  matches,
  loading,
  error,
  noun,
  describe,
  blockedReason,
  onPick,
}: {
  name: string
  label?: string
  className?: string
  /** A record is linked: the number is locked until it is unlinked. */
  disabled?: boolean
  /** False without the search permission: Enter just moves on (a new record). */
  searchEnabled?: boolean
  onSearch: (phone: string) => void
  matches: readonly T[] | undefined
  loading: boolean
  error: boolean
  /** "patient", "donor". */
  noun: string
  describe: (match: T) => MatchDescription
  /** Shows a match as not pickable, with the reason ("Already on this case"). */
  blockedReason?: (match: T) => string | null
  onPick: (picked: T | null) => void
}) {
  const { control } = useFormContext<FieldValues>()
  const {
    field: { ref, value, onChange, onBlur },
    fieldState,
  } = useController({ control, name })
  const options: readonly (T | typeof NEW)[] | undefined =
    matches && matches.length > 0 ? [NEW, ...matches] : matches

  return (
    <Field data-invalid={fieldState.invalid} className={className}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <AutocompleteInput
        id={name}
        ref={ref}
        type="tel"
        inputMode="numeric"
        maxLength={20}
        placeholder="01XXXXXXXXX"
        disabled={disabled}
        value={typeof value === "string" ? value : ""}
        onValueChange={(text) => onChange(text.replace(/\D/g, ""))}
        onBlur={onBlur}
        onSearch={onSearch}
        searchEnabled={searchEnabled}
        picked={disabled}
        // A new number is ordinary: no match goes straight on to the new record's fields.
        emptyMovesOn
        items={options}
        loading={loading}
        error={error}
        getKey={(option) => (option === NEW ? NEW : String(option.id))}
        isItemDisabled={(option) =>
          option !== NEW && (blockedReason?.(option) ?? null) !== null
        }
        renderItem={(option) => {
          if (option === NEW) {
            return <span className="font-medium">New {noun}</span>
          }
          const { title, detail } = describe(option)
          const extra = [detail, blockedReason?.(option)]
            .filter(Boolean)
            .join(" · ")
          return (
            <div className="flex flex-col">
              <span>{title}</span>
              {extra ? (
                <span className="text-xs text-muted-foreground">{extra}</span>
              ) : null}
            </div>
          )
        }}
        onSelect={(option) => onPick(option === NEW ? null : option)}
        listClassName="w-96"
        aria-invalid={fieldState.invalid}
      />
      <FieldError errors={[fieldState.error]} />
    </Field>
  )
}

/** Moves focus past a section whose fields were just locked (to the next field, else the next button). */
export function focusPast(section: HTMLElement) {
  if (focusNextField(section)) {
    return
  }
  const form = section.closest("form")
  const button = Array.from(
    form?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []
  ).find(
    (element) =>
      (section.compareDocumentPosition(element) &
        Node.DOCUMENT_POSITION_FOLLOWING) !==
        0 && !section.contains(element)
  )
  button?.focus()
}

/** The section shows a found record: its number, and a way back to a new record. */
export function LinkedRecord({
  recordNo,
  kind,
  onUnlink,
}: {
  recordNo: string
  /** "Returning patient". */
  kind: string
  onUnlink: () => void
}) {
  return (
    <div className="flex min-h-8 items-center gap-2 rounded-lg border bg-muted/50 py-0.5 pr-0.5 pl-2.5 text-sm">
      <BadgeCheckIcon className="size-4 shrink-0 text-muted-foreground" />
      <span className="font-medium">{recordNo}</span>
      <span className="truncate text-muted-foreground">{kind}</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="ml-auto"
        onClick={onUnlink}
      >
        Change
      </Button>
    </div>
  )
}
