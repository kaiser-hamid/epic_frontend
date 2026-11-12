"use client"

import { EnumControl, MobileControl } from "@/components/form-controls"
import { designationLabels } from "@/modules/shared/auth/enums"

/** Designation (searchable) and mobile phone, shared by the new-user form and the edit dialog. */
export function DesignationAndPhoneFields() {
  return (
    <>
      <EnumControl
        name="designation"
        label="Designation"
        labels={designationLabels}
        placeholder="Select designation"
        required
        searchable
      />
      <MobileControl name="phone" label="Phone" />
    </>
  )
}
