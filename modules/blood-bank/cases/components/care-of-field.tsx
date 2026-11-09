"use client"

import { EnumControl } from "@/components/form-controls"
import { careTypeLabels } from "@/modules/blood-bank/enums"

/**
 * "Care of" (Daycare / Takeaway), required on a Blood Bank bill and editable on the case.
 * Renders inside any `FormProvider`; `name` is its path there (`category_details.care_type` on
 * New Bill Entry, `care_type` on the case details form).
 */
export function CareOfField({ name }: { name: string }) {
  return (
    <EnumControl
      name={name}
      label="Care of"
      required
      labels={careTypeLabels}
      placeholder="Select care type"
      className="sm:max-w-xs"
    />
  )
}
