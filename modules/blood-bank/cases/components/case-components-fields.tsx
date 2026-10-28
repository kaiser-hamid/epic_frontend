"use client"

import { PlusIcon, Trash2Icon } from "lucide-react"
import { useFieldArray, useFormContext } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { FieldDescription, FieldError } from "@/components/ui/field"
import { NumberControl } from "@/modules/blood-bank/cases/components/case-form-controls"
import type { CaseCreateValues } from "@/modules/blood-bank/cases/schemas"

type ComponentLine = CaseCreateValues["components"][number]

/** Requested blood components (optional). No component type lookup yet, so lines take the ID. */
export function CaseComponentsFields() {
  const { control, formState } = useFormContext<CaseCreateValues>()
  const components = useFieldArray({ control, name: "components" })
  const componentsError = formState.errors.components

  return (
    <div className="flex flex-col gap-4">
      {components.fields.length === 0 ? (
        <FieldDescription>No components requested.</FieldDescription>
      ) : null}
      {components.fields.map((line, index) => (
        <div key={line.id} className="flex items-start gap-3">
          <NumberControl
            name={`components.${index}.component_type_id`}
            label="Component type ID"
            placeholder="Component type ID"
            hideLabel
            min={1}
            className="flex-1"
          />
          <NumberControl
            name={`components.${index}.quantity`}
            label="Quantity"
            placeholder="Qty"
            hideLabel
            min={1}
            max={20}
            className="w-28"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Remove component"
            onClick={() => components.remove(index)}
          >
            <Trash2Icon />
          </Button>
        </div>
      ))}
      <FieldError errors={[componentsError?.root ?? componentsError]} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => components.append({ quantity: 1 } as ComponentLine)}
      >
        <PlusIcon data-icon="inline-start" />
        Add component
      </Button>
    </div>
  )
}
