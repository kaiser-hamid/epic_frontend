"use client"

import { format, isValid, parse, startOfDay } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { useState } from "react"

import { TimePicker } from "@/components/time-picker"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const VALUE_FORMAT = "yyyy-MM-dd"
const DISPLAY_FORMAT = "dd/MM/yyyy"

/** A part of the box: flat, highlighted on hover, focus and while its picker is open. */
const SEGMENT =
  "h-full rounded-none border-0 px-2.5 font-normal tabular-nums focus-visible:bg-muted focus-visible:ring-0 aria-invalid:ring-0"

/** `YYYY-MM-DDTHH:mm` → its date and time parts ("" when missing). */
function split(value: string): { date: string; time: string } {
  const at = value.indexOf("T")
  return at === -1
    ? { date: value, time: "" }
    : { date: value.slice(0, at), time: value.slice(at + 1) }
}

/** Both parts empty is "" (no value); otherwise `date` + "T" + `time`. */
function join(date: string, time: string): string {
  return date === "" && time === "" ? "" : `${date}T${time}`
}

function toDate(value: string): Date | null {
  const date = parse(value, VALUE_FORMAT, new Date())
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && isValid(date) ? date : null
}

/**
 * Date and time in one box, picked, never typed: the date part opens a calendar, the time
 * part the hour/minute/AM-PM list (`TimePicker`). Holds `YYYY-MM-DDTHH:mm` (wall time, the
 * same as a `datetime-local` input), or "" for none; each part changes on its own. Both
 * parts are buttons, so `<Form>`'s Enter steps past the field.
 */
export function DateTimePicker({
  id,
  ref,
  value,
  onChange,
  onBlur,
  min,
  max,
  disabled,
  invalid,
  className,
}: {
  /** On the date part (for `<label htmlFor>`); the time part gets `${id}_time`. */
  id?: string
  /** The date part, so a failed validation can focus the field. */
  ref?: React.Ref<HTMLButtonElement>
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  /** First pickable day; none by default. */
  min?: Date
  /** Last pickable day; none by default. */
  max?: Date
  disabled?: boolean
  invalid?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const { date, time } = split(value)
  const selected = toDate(date) ?? undefined
  const first = min === undefined ? undefined : startOfDay(min)
  const [month, setMonth] = useState(() => selected ?? first ?? new Date())
  const disabledDays = [
    ...(first === undefined ? [] : [{ before: first }]),
    ...(max === undefined ? [] : [{ after: max }]),
  ]

  return (
    <div
      role="group"
      data-invalid={invalid}
      className={cn(
        "flex h-8 w-full min-w-0 items-stretch overflow-hidden rounded-lg border border-input transition-colors has-disabled:bg-input/50 has-disabled:opacity-50 has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50 data-[invalid=true]:border-destructive data-[invalid=true]:ring-3 data-[invalid=true]:ring-destructive/20 dark:bg-input/30 dark:data-[invalid=true]:border-destructive/50 dark:data-[invalid=true]:ring-destructive/40",
        className
      )}
    >
      <Popover
        open={open}
        onOpenChange={(next) => {
          if (next) {
            setMonth(selected ?? first ?? new Date())
          }
          setOpen(next)
          if (!next) {
            onBlur?.()
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            id={id}
            ref={ref}
            type="button"
            variant="ghost"
            disabled={disabled}
            aria-invalid={invalid}
            aria-label={
              selected
                ? `Date ${format(selected, DISPLAY_FORMAT)}`
                : "Pick a date"
            }
            className={cn(
              SEGMENT,
              "min-w-0 flex-1 justify-between",
              !selected && "text-muted-foreground"
            )}
          >
            {selected ? format(selected, DISPLAY_FORMAT) : "Select date"}
            <CalendarIcon className="text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            selected={selected}
            month={month}
            onMonthChange={setMonth}
            startMonth={first}
            endMonth={max}
            disabled={disabledDays}
            onSelect={(picked) => {
              if (!picked) {
                return
              }
              onChange(join(format(picked, VALUE_FORMAT), time))
              setOpen(false)
              onBlur?.()
            }}
          />
        </PopoverContent>
      </Popover>
      <span aria-hidden className="my-1.5 w-px shrink-0 bg-input" />
      <TimePicker
        id={id === undefined ? undefined : `${id}_time`}
        variant="ghost"
        value={time}
        onChange={(nextTime) => onChange(join(date, nextTime))}
        onBlur={onBlur}
        disabled={disabled}
        invalid={invalid}
        className={cn(SEGMENT, "w-32")}
      />
    </div>
  )
}
