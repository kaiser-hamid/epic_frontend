"use client"

import { ScanBarcodeIcon } from "lucide-react"
import { useEffect, useState } from "react"

import { DateInput } from "@/components/date-input"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { useDebouncedValue } from "@/hooks/use-debounced-value"

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Exact-match text filter for list screens that also takes barcode scans: applied as typing
 * pauses, or at once on Enter (a scanner's suffix), then selected so the next scan replaces
 * it.
 */
export function ScanFilter({
  id,
  label,
  value,
  onCommit,
}: {
  id: string
  label: string
  value: string | null
  onCommit: (value: string | null) => void
}) {
  const [text, setText] = useState(value ?? "")
  const debounced = useDebouncedValue(text)

  useEffect(() => {
    const next = debounced.trim() || null
    if (next !== value) {
      onCommit(next)
    }
    // Only a settled edit commits; `value` changing from the URL must not re-commit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  return (
    <Field className="w-48">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <InputGroup>
        <InputGroupAddon>
          <ScanBarcodeIcon />
        </InputGroupAddon>
        <InputGroupInput
          id={id}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              const next = text.trim() || null
              if (next !== value) {
                onCommit(next)
              }
              event.currentTarget.select()
            }
          }}
          placeholder="Scan or type"
          autoComplete="off"
          spellCheck={false}
        />
      </InputGroup>
    </Field>
  )
}

/**
 * Date filter (`YYYY-MM-DD`) that only reaches the URL once a full date is typed or picked.
 * Leaving it empty or half-typed puts the applied date back.
 */
export function DateFilter({
  id,
  label,
  value,
  disabled,
  onCommit,
}: {
  id: string
  label: string
  value: string
  disabled: boolean
  onCommit: (value: string) => void
}) {
  const [text, setText] = useState(value)

  return (
    <Field className="w-44">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <DateInput
        id={id}
        value={text}
        disabled={disabled}
        onChange={(next) => {
          setText(next)
          if (ISO_DATE.test(next) && next !== value) {
            onCommit(next)
          }
        }}
        onBlur={() => {
          if (!ISO_DATE.test(text)) {
            setText(value)
          }
        }}
      />
    </Field>
  )
}
