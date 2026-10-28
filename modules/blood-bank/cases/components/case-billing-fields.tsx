"use client"

import { PlusIcon, Trash2Icon } from "lucide-react"
import { useFieldArray, useFormContext, useWatch } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { FieldDescription, FieldError } from "@/components/ui/field"
import {
  CheckboxControl,
  NumberControl,
  TextControl,
} from "@/modules/blood-bank/cases/components/case-form-controls"
import type { CaseCreateValues } from "@/modules/blood-bank/cases/schemas"

type TestLine = CaseCreateValues["billing"]["items"][number]

/**
 * Tests billed on the invoice. Rates come from the catalog on the server. There is no
 * test catalog lookup yet, so lines take the test item ID.
 */
export function CaseTestItemsFields() {
  const { control, formState } = useFormContext<CaseCreateValues>()
  const items = useFieldArray({ control, name: "billing.items" })
  const itemsError = formState.errors.billing?.items

  return (
    <div className="flex flex-col gap-4">
      <FieldDescription>
        Enter the test item ID; the rate is taken from the test catalog.
      </FieldDescription>
      {items.fields.map((line, index) => (
        <div key={line.id} className="flex items-start gap-3">
          <NumberControl
            name={`billing.items.${index}.test_item_id`}
            label="Test item ID"
            placeholder="Test item ID"
            hideLabel
            min={1}
            className="flex-1"
          />
          <NumberControl
            name={`billing.items.${index}.quantity`}
            label="Quantity"
            placeholder="Qty"
            hideLabel
            min={1}
            max={999}
            className="w-28"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Remove test"
            disabled={items.fields.length === 1}
            onClick={() => items.remove(index)}
          >
            <Trash2Icon />
          </Button>
        </div>
      ))}
      <FieldError errors={[itemsError?.root ?? itemsError]} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => items.append({ quantity: 1 } as TestLine)}
      >
        <PlusIcon data-icon="inline-start" />
        Add test
      </Button>
    </div>
  )
}

/** Who sent the patient. No doctor or staff lookup yet, so they take IDs. */
export function CaseReferralFields() {
  const { control, setValue, clearErrors } = useFormContext<CaseCreateValues>()
  const isSelfReferral = useWatch({
    control,
    name: "billing.referral.is_self_referral",
  })

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <CheckboxControl
        name="billing.referral.is_self_referral"
        label="Self referral"
        className="sm:col-span-2 lg:col-span-4"
        onCheckedChange={(checked) => {
          // The backend rejects a doctor on a self referral.
          if (checked) {
            setValue("billing.referral.doctor_id", undefined)
            clearErrors("billing.referral.doctor_id")
          }
        }}
      />
      <NumberControl
        name="billing.referral.doctor_id"
        label="Referring doctor ID"
        min={1}
        disabled={isSelfReferral}
      />
      <NumberControl
        name="billing.referral.second_doctor_id"
        label="Second doctor ID"
        min={1}
      />
      <NumberControl
        name="billing.referral.referred_by_staff_id"
        label="Referred by staff ID"
        min={1}
      />
      <TextControl name="billing.referral.remark" label="Remark" />
    </div>
  )
}
