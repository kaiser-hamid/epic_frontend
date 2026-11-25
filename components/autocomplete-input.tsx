"use client"

import { Command as CommandPrimitive } from "cmdk"
import { useEffect, useRef, useState, type ReactNode } from "react"

import {
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { focusNextField } from "@/components/form"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

type AutocompleteInputProps<T> = Omit<
  React.ComponentProps<typeof InputGroupInput>,
  "value" | "onChange" | "onSelect" | "role"
> & {
  value: string
  /** Typed text. Typing closes the results; they belong to the text searched. */
  onValueChange: (text: string) => void
  /** Enter on typed text: run the lookup for the trimmed text; its results come back as `items`. */
  onSearch: (term: string) => void
  /** Results of the last search. */
  items: readonly T[] | undefined
  /** The search is running (no results to show yet). */
  loading?: boolean
  /** The search failed. */
  error?: boolean
  /** The text is a picked record: Enter moves on instead of searching again. */
  picked?: boolean
  /** False when the user may not search (missing permission): Enter just moves on. */
  searchEnabled?: boolean
  getKey: (item: T) => string
  /** Shown but not pickable (e.g. a donor already on the case). */
  isItemDisabled?: (item: T) => boolean
  renderItem: (item: T) => ReactNode
  onSelect: (item: T) => void
  emptyText?: string
  /**
   * No results is an ordinary answer here (a new phone number): instead of "No data found."
   * the results stay closed and focus moves on to the next field.
   */
  emptyMovesOn?: boolean
  /** Width of the results; defaults to the input width, at least 18rem. */
  listClassName?: string
}

/**
 * Lookup input that searches on Enter, never while typing. Enter on typed text runs
 * `onSearch`; while it runs a spinner shows in the input and the focus stays (Enter waits).
 * Then the results open under the input: arrow keys move, Enter picks, Escape
 * closes, and "No data found." says when nothing matched (Enter there moves on; after a
 * failed search it retries; with `emptyMovesOn` it moves on without the message). Enter on
 * an empty field (or on a picked record) keeps its `<Form>` meaning: next field.
 */
export function AutocompleteInput<T>({
  value,
  onValueChange,
  onSearch,
  items,
  loading = false,
  error = false,
  picked = false,
  searchEnabled = true,
  getKey,
  isItemDisabled,
  renderItem,
  onSelect,
  emptyText = "No data found.",
  emptyMovesOn = false,
  listClassName,
  className,
  onKeyDown,
  onBlur,
  ...inputProps
}: AutocompleteInputProps<T>) {
  const rootRef = useRef<HTMLDivElement>(null)
  // Opened by Enter; shown unless `emptyMovesOn` skips an empty result.
  const [requested, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState("")
  const keys = (items ?? []).map(getKey)
  const pickable = (items ?? [])
    .filter((item) => !(isItemDisabled?.(item) ?? false))
    .map(getKey)
  const active = pickable.includes(highlighted)
    ? highlighted
    : (pickable[0] ?? "")
  const term = value.trim()
  // Enter searches; otherwise `<Form>` moves the focus on.
  const searchable = term !== "" && !picked && searchEnabled
  const skipEmpty =
    emptyMovesOn && requested && !loading && !error && keys.length === 0
  // The answer opens the list; until then the spinner in the input shows the search.
  const searching = requested && loading
  const open = requested && !loading && !skipEmpty

  // Nothing found where that is expected: straight on to the next field (its blur closes).
  useEffect(() => {
    if (skipEmpty && rootRef.current) {
      focusNextField(rootRef.current)
    }
  }, [skipEmpty])

  return (
    <CommandPrimitive
      ref={rootRef}
      shouldFilter={false}
      value={active}
      onValueChange={setHighlighted}
      className={cn("min-w-0", className)}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <InputGroup>
            <InputGroupInput
              {...inputProps}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={open}
              aria-busy={searching}
              data-enter-key={searchable ? "native" : undefined}
              value={value}
              onChange={(event) => {
                onValueChange(event.target.value)
                setOpen(false)
              }}
              onKeyDown={(event) => {
                onKeyDown?.(event)
                const plainEnter =
                  event.key === "Enter" &&
                  !event.nativeEvent.isComposing &&
                  !event.altKey &&
                  !event.ctrlKey &&
                  !event.metaKey &&
                  !event.shiftKey
                if (searching) {
                  // Wait for the answer: Enter neither searches again nor moves on.
                  event.stopPropagation()
                  if (plainEnter) {
                    event.preventDefault()
                  }
                  return
                }
                if (open) {
                  // The results take arrows and Enter. With none to pick, Enter retries a
                  // failed search, or closes "No data found." and moves on.
                  if (plainEnter && keys.length === 0) {
                    event.preventDefault()
                    if (error && searchable) {
                      onSearch(term)
                    } else {
                      setOpen(false)
                      focusNextField(event.currentTarget)
                    }
                  }
                  return
                }
                // Closed: keep keys (Home, End, Enter) away from the list.
                event.stopPropagation()
                if (!plainEnter || !searchable) {
                  return
                }
                event.preventDefault()
                onSearch(term)
                setOpen(true)
              }}
              onBlur={(event) => {
                setOpen(false)
                onBlur?.(event)
              }}
            />
            {searching ? (
              <InputGroupAddon align="inline-end">
                <Spinner />
              </InputGroupAddon>
            ) : null}
          </InputGroup>
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
            <CommandEmpty>
              {error ? "Could not search. Press Enter to retry." : emptyText}
            </CommandEmpty>
            <CommandGroup>
              {(items ?? []).map((item) => (
                <CommandItem
                  key={getKey(item)}
                  value={getKey(item)}
                  disabled={isItemDisabled?.(item) ?? false}
                  onSelect={() => {
                    setOpen(false)
                    onSelect(item)
                  }}
                >
                  {renderItem(item)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </PopoverContent>
      </Popover>
    </CommandPrimitive>
  )
}
