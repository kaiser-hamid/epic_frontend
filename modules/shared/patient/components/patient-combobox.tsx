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
import { usePatient, usePatientSearch } from "@/modules/shared/patient/queries"
import type { Patient } from "@/modules/shared/patient/types"

function patientLabel(patient: Patient): string {
  return `${patient.patient_no} · ${patient.name}`
}

type PatientComboboxProps = {
  id?: string
  value: number | null | undefined
  onChange: (patientId: number | null) => void
  invalid?: boolean
  disabled?: boolean
}

/** Search-as-you-type patient picker. Barcode scans of a patient no work as typed input. */
export function PatientCombobox({
  id,
  value,
  onChange,
  invalid,
  disabled,
}: PatientComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search)
  const results = usePatientSearch(debouncedSearch)
  const selected = usePatient(value)

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
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span
            className={cn(
              "truncate",
              !selected.data && "text-muted-foreground"
            )}
          >
            {selected.data ? patientLabel(selected.data) : "Search patient…"}
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
            placeholder="Patient no, name or phone"
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
                  : "No patient found."}
              </CommandEmpty>
            )}
            <CommandGroup>
              {(results.data ?? []).map((patient) => (
                <CommandItem
                  key={patient.id}
                  value={String(patient.id)}
                  onSelect={() => {
                    onChange(patient.id)
                    setOpen(false)
                  }}
                >
                  <div className="flex flex-col">
                    <span>{patientLabel(patient)}</span>
                    <span className="text-xs text-muted-foreground">
                      {[
                        patient.age ? `${patient.age}y` : null,
                        patient.gender,
                        patient.phone,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                  <CheckIcon
                    className={cn(
                      "ml-auto",
                      value === patient.id ? "opacity-100" : "opacity-0"
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
