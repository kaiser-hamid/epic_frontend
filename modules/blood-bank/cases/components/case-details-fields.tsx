"use client"

import {
  EnumControl,
  TextControl,
} from "@/modules/blood-bank/cases/components/case-form-controls"
import { careTypeLabels } from "@/modules/blood-bank/enums"

/** Case details. Must render inside the registration `FormProvider`. */
export function CaseDetailsFields() {
  return (
    <div className="flex flex-col gap-5">
      <EnumControl
        name="care_type"
        label="Care of"
        labels={careTypeLabels}
        placeholder="Select care type"
        className="sm:max-w-xs"
      />
      <TextControl
        name="transfusion_reason"
        label="Cause of transfusion"
        multiline
      />
      <TextControl name="reference_note" label="Reference note" multiline />
    </div>
  )
}
