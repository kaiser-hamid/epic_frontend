"use client"

import { CheckIcon, MinusIcon } from "lucide-react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Larger (20px) checkbox for selection lists such as permission grants: ticked is a green fill with a white
 * check, `"indeterminate"` (part of a group ticked) a green border with a green dash.
 */
export function CheckBox({
  className,
  checked,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="check-box"
      checked={checked}
      className={cn(
        "peer flex size-5 shrink-0 items-center justify-center rounded-[5px] border-2 border-input bg-background transition-colors outline-none",
        "focus-visible:ring-3 focus-visible:ring-ring/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "hover:not-disabled:border-success/60",
        "data-checked:border-success data-checked:bg-success data-checked:text-primary-foreground",
        "data-[state=indeterminate]:border-success data-[state=indeterminate]:text-success",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="grid place-content-center [&>svg]:size-4 [&>svg]:stroke-3">
        {checked === "indeterminate" ? <MinusIcon /> : <CheckIcon />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}
