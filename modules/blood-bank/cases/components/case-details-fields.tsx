"use client"

import { RequestedComponentControl } from "@/modules/blood-bank/cases/components/case-components-fields"
import {
  EnumControl,
  TextControl,
} from "@/modules/blood-bank/cases/components/case-form-controls"
import { careTypeLabels } from "@/modules/blood-bank/enums"

/** Case details. Single-line inputs, so Enter moves on. Must render inside the registration `FormProvider`. */
export function CaseDetailsFields() {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <EnumControl
          name="care_type"
          label="Care of"
          required
          labels={careTypeLabels}
          placeholder="Select care type"
        />
        <RequestedComponentControl />
      </div>
      <TextControl name="transfusion_reason" label="Cause of transfusion" />
      <TextControl name="reference_note" label="Reference note" />
    </div>
  )
}
