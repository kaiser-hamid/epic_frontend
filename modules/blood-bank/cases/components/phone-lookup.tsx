"use client"

import { BadgeCheckIcon, UserPlusIcon } from "lucide-react"
import { useRef, useState } from "react"
import { flushSync } from "react-dom"
import { toast } from "sonner"

import { focusNextField } from "@/components/form"
import { Button } from "@/components/ui/button"
import { errorMessage } from "@/lib/api-error"
import { cn } from "@/lib/utils"

/**
 * "Type the number first" for the case form: the phone field looks up a returning patient
 * or donor on blur/Enter. One match fills the section read-only; several are offered to
 * pick from; none leaves the section open for a new record.
 */

/** Shorter numbers are still being typed or cannot be a phone. */
const MIN_LOOKUP_DIGITS = 6

export type PhoneLookupResult<T> =
  { status: "skipped" | "none" | "many" } | { status: "one"; match: T }

/** Runs the lookup once per number; a number edited while a lookup runs discards that result. */
export function usePhoneLookup<T>(
  find: (phone: string) => Promise<T[]>,
  { enabled }: { enabled: boolean }
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
      if (first && rest.length === 0) {
        return { status: "one", match: first }
      }
      // Rendered now, so the caller can focus the first match.
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

  function clearMatches() {
    setMatches([])
  }

  return { pending, matches, lookup, forget, clearMatches }
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

export function focusFirstMatch(section: HTMLElement) {
  section.querySelector<HTMLButtonElement>("[data-lookup-match]")?.focus()
}

type MatchDescription = { title: string; detail: string }

/** Several records share the number: pick one, or keep a new record. */
export function LookupMatches<T extends { id: number }>({
  matches,
  noun,
  describe,
  onPick,
  onNew,
  className,
}: {
  matches: T[]
  /** "patient", "donor". */
  noun: string
  describe: (match: T) => MatchDescription
  onPick: (match: T) => void
  onNew: () => void
  className?: string
}) {
  return (
    <div
      role="group"
      aria-label={`Matching ${noun}s`}
      className={cn("flex flex-col gap-1 rounded-lg border p-2", className)}
    >
      <p className="px-2 py-1 text-sm text-muted-foreground">
        {matches.length} {noun}s use this number. Pick one, or register a new{" "}
        {noun}.
      </p>
      {matches.map((match) => {
        const { title, detail } = describe(match)
        return (
          <Button
            key={match.id}
            type="button"
            variant="ghost"
            data-lookup-match
            className="h-auto justify-start py-2 text-left"
            onClick={() => onPick(match)}
          >
            <span className="flex flex-col">
              <span>{title}</span>
              {detail ? (
                <span className="text-xs font-normal text-muted-foreground">
                  {detail}
                </span>
              ) : null}
            </span>
          </Button>
        )
      })}
      <Button
        type="button"
        variant="ghost"
        className="justify-start text-muted-foreground"
        onClick={onNew}
      >
        <UserPlusIcon data-icon="inline-start" />
        New {noun} with this number
      </Button>
    </div>
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
