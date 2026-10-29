"use client"

import { Command as CommandPrimitive } from "cmdk"
import { useState, type ReactNode } from "react"

import {
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

type AutocompleteInputProps<T> = Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange" | "onSelect" | "role"
> & {
  value: string
  /** Typed text; opens the suggestions. */
  onValueChange: (text: string) => void
  /** Suggestions for the current text. */
  items: readonly T[] | undefined
  /** Suggestions for the current text are not in yet; Enter waits for them. */
  loading?: boolean
  getKey: (item: T) => string
  renderItem: (item: T) => ReactNode
  onSelect: (item: T) => void
  emptyText?: string
  /** Width of the suggestions; defaults to the input width, at least 18rem. */
  listClassName?: string
}

/**
 * Text input with a suggestion list (type-ahead). Arrow keys move through the list and
 * Enter picks; with nothing to pick, Enter keeps its `<Form>` meaning (next field).
 * Filtering is up to the caller (server lookups).
 */
export function AutocompleteInput<T>({
  value,
  onValueChange,
  items,
  loading = false,
  getKey,
  renderItem,
  onSelect,
  emptyText = "No match.",
  listClassName,
  className,
  onKeyDown,
  onBlur,
  ...inputProps
}: AutocompleteInputProps<T>) {
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState("")
  const keys = (items ?? []).map(getKey)
  const active = keys.includes(highlighted) ? highlighted : (keys[0] ?? "")
  const showList = open && value.trim() !== ""
  // Expanded only while there is something Enter can pick (or will be soon).
  const expanded = showList && (loading || keys.length > 0)

  return (
    <CommandPrimitive
      shouldFilter={false}
      value={active}
      onValueChange={setHighlighted}
      className={cn("min-w-0", className)}
    >
      <Popover open={showList} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <Input
            {...inputProps}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={expanded}
            autoComplete="off"
            value={value}
            onChange={(event) => {
              onValueChange(event.target.value)
              setOpen(true)
            }}
            onKeyDown={(event) => {
              onKeyDown?.(event)
              if (showList) {
                return
              }
              // Closed: keep keys (Home, End, Enter) away from the list.
              event.stopPropagation()
              if (event.key === "ArrowDown" && value.trim() !== "") {
                event.preventDefault()
                setOpen(true)
              }
            }}
            onBlur={(event) => {
              setOpen(false)
              onBlur?.(event)
            }}
          />
        </PopoverAnchor>
        <PopoverContent
          align="start"
          className={cn(
            "w-(--radix-popover-trigger-width) min-w-72 p-0",
            listClassName
          )}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          // Keeps focus in the input while picking with the mouse.
          onMouseDown={(event) => event.preventDefault()}
        >
          <CommandList>
            {loading ? (
              <div className="flex justify-center p-4">
                <Spinner />
              </div>
            ) : (
              <>
                <CommandEmpty>{emptyText}</CommandEmpty>
                <CommandGroup>
                  {(items ?? []).map((item) => (
                    <CommandItem
                      key={getKey(item)}
                      value={getKey(item)}
                      onSelect={() => {
                        setOpen(false)
                        onSelect(item)
                      }}
                    >
                      {renderItem(item)}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </PopoverContent>
      </Popover>
    </CommandPrimitive>
  )
}
