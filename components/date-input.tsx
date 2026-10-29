"use client"

import { format, isValid, parse } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { useRef, useState } from "react"

import { Calendar } from "@/components/ui/calendar"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"

const VALUE_FORMAT = "yyyy-MM-dd"
const DISPLAY_FORMAT = "dd/MM/yyyy"
/** Typed forms accepted besides `dd/MM/yyyy`. */
const TYPED_FORMATS = [
  DISPLAY_FORMAT,
  "d/M/yyyy",
  "d-M-yyyy",
  "d.M.yyyy",
  "ddMMyyyy",
  VALUE_FORMAT,
]
const MIN_YEAR = 1900

function toDate(value: string): Date | null {
  const date = parse(value, VALUE_FORMAT, new Date())
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && isValid(date) ? date : null
}

function parseTyped(text: string): Date | null {
  for (const pattern of TYPED_FORMATS) {
    const date = parse(text, pattern, new Date())
    if (isValid(date) && date.getFullYear() >= MIN_YEAR) {
      return date
    }
  }
  return null
}

/** Typed text → form value: `YYYY-MM-DD`, "" when empty, else the raw text (zod rejects it). */
function toValue(text: string): string {
  const trimmed = text.trim()
  if (trimmed === "") {
    return ""
  }
  const date = parseTyped(trimmed)
  return date ? format(date, VALUE_FORMAT) : trimmed
}

function toDisplay(value: string): string {
  const date = toDate(value)
  return date ? format(date, DISPLAY_FORMAT) : value
}

type DateInputProps = {
  id?: string
  name?: string
  ref?: React.Ref<HTMLInputElement>
  /** `YYYY-MM-DD`, or "" for none. */
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  disabled?: boolean
  invalid?: boolean
  /** Last pickable day; defaults to today (dates of birth). */
  max?: Date
}

/**
 * Plain-date field: type `dd/MM/yyyy` (also `ddMMyyyy`, `d-M-yyyy`) or pick from the
 * calendar, which opens on any click in the field. Focus stays in the input, so typing
 * still works and Enter still moves on. Holds the API's `YYYY-MM-DD`; unparseable text is
 * kept so validation can flag it.
 */
export function DateInput({
  id,
  name,
  ref,
  value,
  onChange,
  onBlur,
  disabled,
  invalid,
  max,
}: DateInputProps) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(() => toDisplay(value))
  const [syncedValue, setSyncedValue] = useState(value)
  const last = max ?? new Date()
  const selected = toDate(value) ?? undefined
  const [month, setMonth] = useState(() => selected ?? last)
  const anchorRef = useRef<HTMLDivElement>(null)

  // The value changed from outside (filled from a lookup, reset): show it.
  if (value !== syncedValue) {
    setSyncedValue(value)
    if (toValue(text) !== value) {
      setText(toDisplay(value))
      if (selected) {
        setMonth(selected)
      }
    }
  }

  function commit(next: string) {
    setSyncedValue(next)
    onChange(next)
  }

  function openCalendar() {
    if (disabled || open) {
      return
    }
    setMonth(selected ?? last)
    setOpen(true)
  }

  function focusInput() {
    anchorRef.current?.querySelector("input")?.focus()
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <InputGroup ref={anchorRef}>
          <InputGroupInput
            id={id}
            name={name}
            ref={ref}
            inputMode="numeric"
            autoComplete="off"
            maxLength={10}
            placeholder="DD/MM/YYYY"
            // No `aria-expanded`: `<Form>` would then leave Enter to the calendar.
            aria-haspopup="dialog"
            value={text}
            onClick={openCalendar}
            onChange={(event) => {
              const next = event.target.value.replace(/[^\d/.-]/g, "")
              setText(next)
              commit(toValue(next))
              // An open calendar follows the typed date.
              const typed = parseTyped(next.trim())
              if (typed) {
                setMonth(typed)
              }
            }}
            onBlur={() => {
              // Normalise "1/8/1986" to "01/08/1986".
              if (toDate(value)) {
                setText(toDisplay(value))
              }
              onBlur?.()
            }}
            disabled={disabled}
            aria-invalid={invalid}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="icon-xs"
              aria-label={open ? "Close calendar" : "Pick a date"}
              disabled={disabled}
              onClick={() => (open ? setOpen(false) : openCalendar())}
            >
              <CalendarIcon />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </PopoverAnchor>
      {/* Outside the addon: its click handler would pull focus from the month/year selects. */}
      <PopoverContent
        className="w-auto p-0"
        align="start"
        onOpenAutoFocus={(event) => event.preventDefault()}
        // Closing by Tab or a click elsewhere leaves focus where the user put it.
        onCloseAutoFocus={(event) => event.preventDefault()}
        onEscapeKeyDown={focusInput}
        onInteractOutside={(event) => {
          // Clicks in the field itself keep the calendar open.
          if (
            event.target instanceof Node &&
            anchorRef.current?.contains(event.target)
          ) {
            event.preventDefault()
          }
        }}
      >
        <Calendar
          mode="single"
          captionLayout="dropdown"
          reverseYears
          selected={selected}
          month={month}
          onMonthChange={setMonth}
          startMonth={new Date(MIN_YEAR, 0)}
          endMonth={last}
          disabled={{ after: last }}
          onSelect={(date) => {
            if (!date) {
              return
            }
            const next = format(date, VALUE_FORMAT)
            setText(toDisplay(next))
            commit(next)
            setOpen(false)
            focusInput()
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
