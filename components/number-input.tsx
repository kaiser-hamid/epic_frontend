"use client"

import { Input } from "@/components/ui/input"

type NumberInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "value" | "onChange"
> & {
  value: number | null | undefined
  /** `undefined` when the input is empty. */
  onChange: (value: number | undefined) => void
}

/** Numeric input for react-hook-form. Empty stays `undefined`, so zod reports "required" instead of NaN. */
export function NumberInput({ value, onChange, ...props }: NumberInputProps) {
  return (
    <Input
      type="number"
      inputMode="numeric"
      value={value ?? ""}
      onChange={(event) => {
        const next = event.target.valueAsNumber
        onChange(Number.isNaN(next) ? undefined : next)
      }}
      {...props}
    />
  )
}
