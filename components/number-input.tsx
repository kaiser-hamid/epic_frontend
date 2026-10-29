"use client"

import { Input } from "@/components/ui/input"

type NumberInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "value" | "onChange" | "min" | "max"
> & {
  value: number | null | undefined
  /** `undefined` when the input is empty. */
  onChange: (value: number | undefined) => void
  /** Only limits how many digits can be typed; zod checks the range. */
  max?: number
}

/** Typed text → whole number: drops anything but digits; empty is `undefined`. */
export function toWholeNumber(text: string): number | undefined {
  const digits = text.replace(/\D/g, "")
  return digits === "" ? undefined : Number(digits)
}

/**
 * Whole-number input for react-hook-form. A text input, so the mouse wheel and arrow keys
 * never change the value; anything but digits is dropped as it is typed. Empty stays
 * `undefined`, so zod reports "required" instead of NaN.
 */
export function NumberInput({
  value,
  onChange,
  max,
  ...props
}: NumberInputProps) {
  return (
    <Input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      maxLength={max === undefined ? undefined : String(max).length}
      value={value ?? ""}
      onChange={(event) => onChange(toWholeNumber(event.target.value))}
      {...props}
    />
  )
}
