"use client"

import { BadgeCheckIcon } from "lucide-react"
import { useRef, useState } from "react"
import { flushSync } from "react-dom"
import { toast } from "sonner"

import { focusNextField } from "@/components/form"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { errorMessage } from "@/lib/api-error"

/**
 * "Type the number first" for the registration forms (bill entry, Add donor): the phone
 * field looks up returning patients or donors on blur/Enter. Matches are offered in a
 * select next to the number, "New …" selected by default (a form may auto-pick a single
 * match); a picked record fills the section read-only; none leaves it open for a new record.
 */

/** Shorter numbers are still being typed or cannot be a phone. */
const MIN_LOOKUP_DIGITS = 6

export type PhoneLookupResult<T> =
  { status: "skipped" | "none" | "many" } | { status: "one"; match: T }

/**
 * Runs the lookup once per number; a number edited while a lookup runs discards that result.
 * A single match is picked automatically unless `canAutoPick` refuses it; it is then offered
 * in the select like several matches (where it can be shown as not pickable).
 */
export function usePhoneLookup<T>(
  find: (phone: string) => Promise<T[]>,
  {
    enabled,
    canAutoPick,
  }: { enabled: boolean; canAutoPick?: (match: T) => boolean }
) {
  const [pending, setPending] = useState(false)
  const [matches, setMatches] = useState<T[]>([])
  const lastPhone = useRef<string | null>(null)
  const requestId = useRef(0)

  async function lookup(phone: string): Promise<PhoneLookupResult<T>> {
    if (
      !enabled ||
      phone.length < MIN_LOOKUP_DIGITS ||
      phone === lastPhone.current
    ) {
      return { status: "skipped" }
    }
    lastPhone.current = phone
    const id = ++requestId.current
    setMatches([])
    setPending(true)
    try {
      const found = await find(phone)
      if (id !== requestId.current) {
        return { status: "skipped" }
      }
      const [first, ...rest] = found
      if (first && rest.length === 0 && (canAutoPick?.(first) ?? true)) {
        return { status: "one", match: first }
      }
      // Rendered now, so the caller can move focus on to the match select.
      flushSync(() => setMatches(found))
      return { status: found.length > 0 ? "many" : "none" }
    } catch (error) {
      if (id === requestId.current) {
        lastPhone.current = null
        toast.error(errorMessage(error))
      }
      return { status: "skipped" }
    } finally {
      if (id === requestId.current) {
        setPending(false)
      }
    }
  }

  /** The number changed: drop the offered matches and look it up again on commit. */
  function forget() {
    lastPhone.current = null
    requestId.current++
    setPending(false)
    setMatches((current) => (current.length > 0 ? [] : current))
  }

  return { pending, matches, lookup, forget }
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

type MatchDescription = { title: string; detail: string }

const NEW = "new"

/**
 * Records registered with the number: "New …" (the default) or one of them. `value` is the
 * picked record's id; `onChange` gets the picked record, or null for "New …".
 * `blockedReason` disables a match and says why ("Already on this case").
 */
export function LookupMatchSelect<T extends { id: number }>({
  id,
  matches,
  noun,
  describe,
  value,
  onChange,
  blockedReason,
  className,
}: {
  id: string
  matches: T[]
  /** "patient", "donor". */
  noun: string
  describe: (match: T) => MatchDescription
  value: number | undefined
  onChange: (picked: T | null) => void
  blockedReason?: (match: T) => string | null
  className?: string
}) {
  return (
    <Field className={className}>
      <FieldLabel htmlFor={id}>
        {matches.length === 1
          ? `1 ${noun} with this number`
          : `${matches.length} ${noun}s with this number`}
      </FieldLabel>
      <Select
        value={value === undefined ? NEW : String(value)}
        onValueChange={(next) =>
          onChange(matches.find((match) => String(match.id) === next) ?? null)
        }
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectItem value={NEW}>New {noun}</SelectItem>
          {matches.map((match) => {
            const { title, detail } = describe(match)
            const blocked = blockedReason?.(match) ?? null
            const extra = [detail, blocked].filter(Boolean).join(" · ")
            return (
              <SelectItem
                key={match.id}
                value={String(match.id)}
                disabled={blocked !== null}
              >
                {title}
                {extra ? (
                  <span className="text-muted-foreground">{extra}</span>
                ) : null}
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </Field>
  )
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
