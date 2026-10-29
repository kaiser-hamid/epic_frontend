"use client"

import { useState } from "react"

import { useDebouncedValue } from "@/hooks/use-debounced-value"

/** Shorter terms match too much; lookups start at this many characters. */
export const LOOKUP_MIN_LENGTH = 3

/**
 * Type-ahead term for server lookups (doctors, staff, tests). `search` is debounced and
 * stays "" (query disabled) until the term has `LOOKUP_MIN_LENGTH` characters, so fast
 * or short typing sends no request.
 */
export function useLookupTerm() {
  const [term, setTerm] = useState("")
  const trimmed = term.trim()
  const debounced = useDebouncedValue(trimmed)
  const tooShort = trimmed.length < LOOKUP_MIN_LENGTH

  return {
    setTerm,
    /** For the lookup query. */
    search: debounced.length >= LOOKUP_MIN_LENGTH ? debounced : "",
    tooShort,
    /** Typed but not searched yet (debounce running). */
    waiting: !tooShort && debounced !== trimmed,
  }
}

/** Suggestion-list text for a lookup with no rows to show. */
export function lookupEmptyText(
  lookup: { tooShort: boolean; isError: boolean },
  noMatch: string
): string {
  if (lookup.tooShort) {
    return `Type at least ${LOOKUP_MIN_LENGTH} characters.`
  }
  return lookup.isError ? "Could not search. Try again." : noMatch
}
