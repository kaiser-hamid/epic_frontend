"use client"

import { ChevronsUpDownIcon } from "lucide-react"
import { Controller, useFormContext } from "react-hook-form"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useComponentTypes } from "@/modules/blood-bank/component-types/queries"
import type { CaseCreateValues } from "@/modules/blood-bank/cases/schemas"

const ID = "requested_components"

/**
 * Requested blood components (optional, several allowed). Each pick is a one-line entry in
 * the `components` array; the list stays open so several can be ticked in a row.
 */
export function RequestedComponentControl({
  className,
}: {
  className?: string
}) {
  const { control, formState } = useFormContext<CaseCreateValues>()
  const componentTypes = useComponentTypes()
  // Server errors land on a line ("not an active component type", "already listed").
  const lineErrors = formState.errors.components

  function placeholder() {
    if (componentTypes.isPending) {
      return "Loading…"
    }
    return componentTypes.isError
      ? "Could not load component types."
      : "Select components"
  }

  return (
    <Controller
      name="components"
      control={control}
      render={({ field }) => {
        const messages = field.value.map(
          (_, index) => lineErrors?.[index]?.component_type_id
        )
        const hasError = messages.some((error) => error !== undefined)
        const selectedIds = field.value.map((line) => line.component_type_id)
        const selected = (componentTypes.data ?? []).filter((type) =>
          selectedIds.includes(type.id)
        )

        function toggle(typeId: number) {
          field.onChange(
            selectedIds.includes(typeId)
              ? field.value.filter((line) => line.component_type_id !== typeId)
              : [...field.value, { component_type_id: typeId }]
          )
        }

        return (
          <Field data-invalid={hasError} className={className}>
            <FieldLabel htmlFor={ID}>Requested components</FieldLabel>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id={ID}
                  ref={field.ref}
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-invalid={hasError}
                  disabled={!componentTypes.isSuccess}
                  onBlur={field.onBlur}
                  className="h-auto min-h-9 w-full justify-between font-normal"
                >
                  {selected.length === 0 ? (
                    <span className="text-muted-foreground">
                      {placeholder()}
                    </span>
                  ) : (
                    <span className="flex flex-wrap gap-1">
                      {selected.map((type) => (
                        <Badge key={type.id} variant="secondary">
                          {type.code}
                        </Badge>
                      ))}
                    </span>
                  )}
                  <ChevronsUpDownIcon
                    data-icon="inline-end"
                    className="opacity-50"
                  />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-(--radix-popover-trigger-width) p-0"
                align="start"
              >
                <Command>
                  <CommandInput placeholder="Search component" />
                  <CommandList>
                    <CommandEmpty>No component found.</CommandEmpty>
                    <CommandGroup>
                      {componentTypes.data?.map((type) => (
                        <CommandItem
                          key={type.id}
                          value={`${type.code} ${type.name}`}
                          data-checked={selectedIds.includes(type.id)}
                          onSelect={() => toggle(type.id)}
                        >
                          {type.code} – {type.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <FieldError errors={messages} />
          </Field>
        )
      }}
    />
  )
}
