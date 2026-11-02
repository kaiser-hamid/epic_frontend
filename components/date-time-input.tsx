"use client"

import { ClockIcon } from "lucide-react"

import { DateInput } from "@/components/date-input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { cn } from "@/lib/utils"

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

/** `YYYY-MM-DDTHH:mm` → its date and time parts ("" when missing). */
function split(value: string): { date: string; time: string } {
  const at = value.indexOf("T")
  return at === -1
    ? { date: value, time: "" }
    : { date: value.slice(0, at), time: value.slice(at + 1) }
}

/** Both parts empty is "" (no value); otherwise `date` + "T" + `time`, valid or not. */
function join(date: string, time: string): string {
  return date === "" && time === "" ? "" : `${date}T${time}`
}

/** Typed time → `HH:mm` where it can be read ("930", "0930", "9:30"), else the raw text. */
export function normalizeTime(text: string): string {
  const trimmed = text.trim()
  const match = /^(\d{1,2}):?(\d{2})$/.exec(trimmed)
  if (!match) {
    return trimmed
  }
  const [, hours = "", minutes = ""] = match
  const time = `${hours.padStart(2, "0")}:${minutes}`
  return TIME.test(time) ? time : trimmed
}

type DateTimeInputProps = {
  id?: string
  name?: string
  ref?: React.Ref<HTMLInputElement>
  /** `YYYY-MM-DDTHH:mm` (wall time), or "" for none. Partly typed values are kept as typed. */
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  disabled?: boolean
  invalid?: boolean
  /** Last pickable day; defaults to today. */
  max?: Date
  /** The time to fill in when a date is picked and no time is set yet (`HH:mm`). */
  defaultTime?: () => string
  className?: string
}

/**
 * Date and time field: the date from `DateInput` (typed `dd/MM/yyyy` or picked from the
 * calendar) and a typed 24-hour time (`HH:mm`; "0930" becomes "09:30"). Holds the same
 * `YYYY-MM-DDTHH:mm` as a `datetime-local` input, so validation can parse it; an unfinished
 * part is kept so validation can flag it.
 */
export function DateTimeInput({
  id,
  name,
  ref,
  value,
  onChange,
  onBlur,
  disabled,
  invalid,
  max,
  defaultTime,
  className,
}: DateTimeInputProps) {
  const { date, time } = split(value)

  return (
    <div className={cn("flex gap-2", className)}>
      <div className="min-w-0 flex-1">
        <DateInput
          id={id}
          name={name}
          ref={ref}
          value={date}
          onChange={(nextDate) =>
            onChange(
              join(
                nextDate,
                time === "" && /^\d{4}-\d{2}-\d{2}$/.test(nextDate)
                  ? (defaultTime?.() ?? "")
                  : time
              )
            )
          }
          onBlur={onBlur}
          disabled={disabled}
          invalid={invalid}
          max={max}
        />
      </div>
      <InputGroup className="w-28 shrink-0">
        <InputGroupInput
          id={id === undefined ? undefined : `${id}_time`}
          aria-label="Time"
          inputMode="numeric"
          autoComplete="off"
          maxLength={5}
          placeholder="HH:MM"
          value={time}
          onChange={(event) =>
            onChange(join(date, event.target.value.replace(/[^\d:]/g, "")))
          }
          onBlur={() => {
            const normalized = normalizeTime(time)
            if (normalized !== time) {
              onChange(join(date, normalized))
            }
            onBlur?.()
          }}
          disabled={disabled}
          aria-invalid={invalid}
        />
        <InputGroupAddon align="inline-end">
          <ClockIcon />
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}
