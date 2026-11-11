"use client"

import { CheckIcon, ChevronsUpDownIcon } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const NONE = "__none__"

type SearchableSelectProps<T extends string> = {
  id?: string
  /** "" means nothing chosen. */
  value: T | "" | null | undefined
  onChange: (value: T | "") => void
  onBlur?: () => void
  /** Enum label map; its key order is the option order. Search matches the labels. */
  labels: Record<T, string>
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  /** Adds a "Not specified" option that clears the value. */
  optional?: boolean
  invalid?: boolean
  disabled?: boolean
  className?: string
}

/**
 * Select over an `as const` enum with a search box, for option lists too long to scan.
 * Closed, Enter moves to the next form field and Space or ArrowDown opens it; open, Enter picks.
 */
export function SearchableSelect<T extends string>({
  id,
  value,
  onChange,
  onBlur,
  labels,
  placeholder = "Select",
  searchPlaceholder = "Search…",
  emptyText = "No match.",
  optional = false,
  invalid,
  disabled,
  className,
}: SearchableSelectProps<T>) {
  const [open, setOpen] = useState(false)
  const options = Object.entries(labels) as [T, string][]
  const selectedLabel = value ? labels[value] : undefined

  function pick(next: T | "") {
    onChange(next)
    setOpen(false)
  }

  return (
    <Popover
      modal
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
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !selectedLabel && "text-muted-foreground",
            className
          )}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault()
              setOpen(true)
            }
          }}
        >
          <span className="truncate">{selectedLabel ?? placeholder}</span>
          <ChevronsUpDownIcon data-icon="inline-end" className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) min-w-56 p-0"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {optional ? (
                <CommandItem
                  value={NONE}
                  keywords={["not specified", "none"]}
                  onSelect={() => pick("")}
                  className="text-muted-foreground"
                >
                  Not specified
                </CommandItem>
              ) : null}
              {options.map(([option, label]) => (
                <CommandItem
                  key={option}
                  value={option}
                  keywords={[label]}
                  onSelect={() => pick(option)}
                >
                  {label}
                  <CheckIcon
                    className={cn(
                      "ml-auto",
                      value === option ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
