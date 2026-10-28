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
import { Spinner } from "@/components/ui/spinner"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { cn } from "@/lib/utils"
import { useDonorSearch } from "@/modules/blood-bank/donors/queries"
import type { Donor } from "@/modules/blood-bank/donors/types"
import { bloodGroupLabels } from "@/modules/shared/patient/enums"

function donorLabel(donor: Donor): string {
  return `${donor.donor_no} · ${donor.name}`
}

type DonorComboboxProps = {
  id?: string
  value: number | null | undefined
  onChange: (donorId: number | null) => void
  invalid?: boolean
}

/**
 * Search-as-you-type picker for a returning donor. There is no donor detail endpoint,
 * so the picked donor is kept here to show its label.
 */
export function DonorCombobox({
  id,
  value,
  onChange,
  invalid,
}: DonorComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [picked, setPicked] = useState<Donor | null>(null)
  const debouncedSearch = useDebouncedValue(search)
  const results = useDonorSearch(debouncedSearch)
  const selected = picked && picked.id === value ? picked : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          className="w-full justify-between font-normal"
        >
          <span
            className={cn("truncate", !selected && "text-muted-foreground")}
          >
            {selected ? donorLabel(selected) : "Search donor…"}
          </span>
          <ChevronsUpDownIcon data-icon="inline-end" className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Donor no, name, phone or NID"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {results.isFetching ? (
              <div className="flex justify-center p-4">
                <Spinner />
              </div>
            ) : (
              <CommandEmpty>
                {debouncedSearch.trim().length < 2
                  ? "Type at least 2 characters."
                  : "No donor found."}
              </CommandEmpty>
            )}
            <CommandGroup>
              {(results.data ?? []).map((donor) => (
                <CommandItem
                  key={donor.id}
                  value={String(donor.id)}
                  onSelect={() => {
                    setPicked(donor)
                    onChange(donor.id)
                    setOpen(false)
                  }}
                >
                  <div className="flex flex-col">
                    <span>{donorLabel(donor)}</span>
                    <span className="text-xs text-muted-foreground">
                      {[
                        donor.blood_group
                          ? bloodGroupLabels[donor.blood_group]
                          : null,
                        donor.age !== null ? `${donor.age}y` : null,
                        donor.phone,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                  <CheckIcon
                    className={cn(
                      "ml-auto",
                      value === donor.id ? "opacity-100" : "opacity-0"
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
