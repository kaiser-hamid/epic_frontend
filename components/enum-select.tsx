"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const NONE = "__none__"

type EnumSelectProps<T extends string> = {
  id?: string
  /** "" means nothing chosen. */
  value: T | "" | null | undefined
  onChange: (value: T | "") => void
  onBlur?: () => void
  /** Enum label map (`genderLabels`); its key order is the option order. */
  labels: Record<T, string>
  placeholder?: string
  /** Adds a "Not specified" option that clears the value. */
  optional?: boolean
  invalid?: boolean
  disabled?: boolean
}

/** Select over an `as const` enum and its label map. */
export function EnumSelect<T extends string>({
  id,
  value,
  onChange,
  onBlur,
  labels,
  placeholder = "Select",
  optional = false,
  invalid,
  disabled,
}: EnumSelectProps<T>) {
  const options = Object.entries(labels) as [T, string][]

  return (
    <Select
      value={value ?? ""}
      onValueChange={(next) => onChange(next === NONE ? "" : (next as T))}
      disabled={disabled}
    >
      <SelectTrigger id={id} aria-invalid={invalid} onBlur={onBlur}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {optional ? (
          <SelectItem value={NONE} className="text-muted-foreground">
            Not specified
          </SelectItem>
        ) : null}
        {options.map(([option, label]) => (
          <SelectItem key={option} value={option}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
