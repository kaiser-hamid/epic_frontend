"use client"

import { ClockIcon } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type Period = "AM" | "PM"

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
const MINUTES = Array.from({ length: 12 }, (_, index) => index * 5)
const PERIODS: Period[] = ["AM", "PM"]

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/

type Parts = { hour: number; minute: number; period: Period }

/** `HH:mm` (24-hour) → 12-hour parts, or null when empty or unreadable. */
function toParts(value: string): Parts | null {
  const match = TIME.exec(value)
  if (!match) {
    return null
  }
  const hours = Number(match[1])
  return {
    hour: hours % 12 || 12,
    minute: Number(match[2]),
    period: hours >= 12 ? "PM" : "AM",
  }
}

function toValue({ hour, minute, period }: Parts): string {
  const hours = (hour % 12) + (period === "PM" ? 12 : 0)
  return `${String(hours).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

function pad(number: number): string {
  return String(number).padStart(2, "0")
}

/**
 * Time chosen from a list, never typed: hour, minute (5-minute steps) and AM/PM columns in a
 * popover, like the date calendar. Holds `HH:mm` (24-hour), or "" for none. Picking any column
 * first fills the others with :00 and the current half of the day.
 */
export function TimePicker({
  id,
  value,
  onChange,
  onBlur,
  disabled,
  invalid,
  className,
}: {
  id?: string
  /** `HH:mm`, or "". */
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  disabled?: boolean
  invalid?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const parts = toParts(value)

  function choose(change: Partial<Parts>) {
    const base: Parts = parts ?? {
      hour: 12,
      minute: 0,
      period: new Date().getHours() >= 12 ? "PM" : "AM",
    }
    onChange(toValue({ ...base, ...change }))
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          onBlur?.()
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-invalid={invalid}
          aria-label={
            parts
              ? `Time ${parts.hour}:${pad(parts.minute)} ${parts.period}`
              : "Pick a time"
          }
          className={cn(
            "justify-between font-normal tabular-nums",
            !parts && "text-muted-foreground",
            className
          )}
        >
          {parts
            ? `${pad(parts.hour)}:${pad(parts.minute)} ${parts.period}`
            : "Select time"}
          <ClockIcon className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="flex gap-1">
          <Column label="Hour">
            {HOURS.map((hour) => (
              <Option
                key={hour}
                selected={parts?.hour === hour}
                onClick={() => choose({ hour })}
              >
                {pad(hour)}
              </Option>
            ))}
          </Column>
          <Column label="Minute">
            {MINUTES.map((minute) => (
              <Option
                key={minute}
                selected={parts?.minute === minute}
                onClick={() => choose({ minute })}
              >
                {pad(minute)}
              </Option>
            ))}
          </Column>
          <Column label="AM or PM">
            {PERIODS.map((period) => (
              <Option
                key={period}
                selected={parts?.period === period}
                onClick={() => choose({ period })}
              >
                {period}
              </Option>
            ))}
          </Column>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function Column({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex max-h-56 w-14 flex-col gap-0.5 overflow-y-auto"
    >
      {children}
    </div>
  )
}

function Option({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={selected ? "default" : "ghost"}
      aria-pressed={selected}
      className="shrink-0 tabular-nums"
      onClick={onClick}
    >
      {children}
    </Button>
  )
}
