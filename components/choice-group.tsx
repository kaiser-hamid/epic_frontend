"use client"

import { CheckIcon } from "lucide-react"
import { RadioGroup as RadioGroupPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

export type ChoiceTone = "default" | "success" | "destructive"

export type ChoiceOption<T extends string> = {
  value: T
  label: string
  /** Colour of the option once chosen. */
  tone?: ChoiceTone
  disabled?: boolean
}

const optionTones: Record<ChoiceTone, string> = {
  default: "has-data-checked:border-primary has-data-checked:bg-primary/5",
  success:
    "has-data-checked:border-green-600 has-data-checked:bg-green-600/10 has-data-checked:text-green-700 dark:has-data-checked:border-green-500 dark:has-data-checked:text-green-400",
  destructive:
    "has-data-checked:border-destructive has-data-checked:bg-destructive/10 has-data-checked:text-destructive",
}

const boxTones: Record<ChoiceTone, string> = {
  default: "data-checked:border-primary data-checked:bg-primary",
  success:
    "data-checked:border-green-600 data-checked:bg-green-600 dark:data-checked:border-green-500 dark:data-checked:bg-green-500",
  destructive: "data-checked:border-destructive data-checked:bg-destructive",
}

/**
 * A single choice shown as labelled, checkbox-style boxes (radio semantics: one value,
 * arrow keys move between options). The whole box is clickable. `""` means nothing chosen.
 * `ref` lands on the chosen option (or the first enabled one) so a form can focus it.
 */
export function ChoiceGroup<T extends string>({
  id,
  value,
  onChange,
  onBlur,
  options,
  disabled,
  invalid,
  className,
  ref,
  "aria-labelledby": labelledBy,
}: {
  /** Unique on the page; each option's id is `${id}_${value}`. */
  id: string
  value: T | ""
  onChange: (value: T) => void
  onBlur?: () => void
  options: readonly ChoiceOption<T>[]
  disabled?: boolean
  invalid?: boolean
  className?: string
  ref?: React.Ref<HTMLButtonElement>
  "aria-labelledby"?: string
}) {
  const focusTarget =
    options.find((option) => option.value === value) ??
    options.find((option) => !option.disabled)

  return (
    <RadioGroupPrimitive.Root
      id={id}
      value={value}
      onValueChange={(next) => {
        const option = options.find((candidate) => candidate.value === next)
        if (option) {
          onChange(option.value)
        }
      }}
      onBlur={onBlur}
      disabled={disabled}
      orientation="horizontal"
      aria-invalid={invalid}
      aria-labelledby={labelledBy}
      className={cn("flex flex-wrap gap-2", className)}
    >
      {options.map((option) => {
        const tone = option.tone ?? "default"
        const optionId = `${id}_${option.value}`
        const optionDisabled = disabled || option.disabled
        return (
          <label
            key={option.value}
            htmlFor={optionId}
            data-disabled={optionDisabled || undefined}
            className={cn(
              "flex min-w-32 cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm font-medium transition-colors select-none hover:bg-muted/50 has-focus-visible:border-ring has-focus-visible:ring-3 has-focus-visible:ring-ring/50 data-disabled:cursor-not-allowed data-disabled:opacity-50 data-disabled:hover:bg-transparent",
              invalid && "border-destructive",
              optionTones[tone]
            )}
          >
            <RadioGroupPrimitive.Item
              id={optionId}
              value={option.value}
              disabled={option.disabled}
              ref={option === focusTarget ? ref : undefined}
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input text-primary-foreground outline-none dark:bg-input/30",
                invalid && "border-destructive",
                boxTones[tone]
              )}
            >
              <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
                <CheckIcon className="size-3.5" />
              </RadioGroupPrimitive.Indicator>
            </RadioGroupPrimitive.Item>
            {option.label}
          </label>
        )
      })}
    </RadioGroupPrimitive.Root>
  )
}
