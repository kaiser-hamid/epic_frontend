"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { FormProvider, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Form } from "@/components/form"
import { TextControl } from "@/components/form-controls"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { errorMessage } from "@/lib/api-error"
import { pickDirty } from "@/lib/dirty-values"
import { applyServerErrors } from "@/lib/form-errors"
import { CareOfField } from "@/modules/blood-bank/cases/components/care-of-field"
import { caseErrorMessages } from "@/modules/blood-bank/cases/error-messages"
import { useUpdateCase } from "@/modules/blood-bank/cases/queries"
import {
  caseDetailsSchema,
  type CaseDetailsValues,
} from "@/modules/blood-bank/cases/schemas"
import type { BloodBankCase } from "@/modules/blood-bank/cases/types"

function detailsValues(record: BloodBankCase): CaseDetailsValues {
  return {
    care_type: record.care_type,
    transfusion_reason: record.transfusion_reason ?? "",
    reference_note: record.reference_note ?? "",
  }
}

/**
 * "Care of", cause of transfusion and reference note of an open case. Sends only what changed;
 * the backend audits old and new values.
 */
export function CaseDetailsDialog({
  record,
  open,
  onOpenChange,
}: {
  record: BloodBankCase
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const updateCase = useUpdateCase()
  const form = useForm<CaseDetailsValues>({
    resolver: zodResolver(caseDetailsSchema),
    defaultValues: detailsValues(record),
  })

  // Start from the saved values each time the dialog opens.
  useEffect(() => {
    if (open) {
      form.reset(detailsValues(record))
    }
  }, [open, record, form])

  function onSubmit(values: CaseDetailsValues) {
    const changes = pickDirty(values, form.formState.dirtyFields)
    if (Object.keys(changes).length === 0) {
      onOpenChange(false)
      return
    }
    updateCase.mutate(
      { id: record.id, changes },
      {
        onSuccess: () => {
          toast.success("Case details saved")
          onOpenChange(false)
        },
        onError: (error) => {
          if (!applyServerErrors(error, form.setError)) {
            toast.error(errorMessage(error, caseErrorMessages))
          }
        },
      }
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={updateCase.isPending ? undefined : onOpenChange}
    >
      <DialogContent>
        <FormProvider {...form}>
          <Form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <DialogHeader>
              <DialogTitle>Case details</DialogTitle>
              <DialogDescription>Case {record.case_no}</DialogDescription>
            </DialogHeader>

            <CareOfField name="care_type" />
            <TextControl
              name="transfusion_reason"
              label="Cause of transfusion"
            />
            <TextControl name="reference_note" label="Reference note" />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={updateCase.isPending}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateCase.isPending}>
                {updateCase.isPending ? <Spinner /> : null}
                Save
              </Button>
            </DialogFooter>
          </Form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  )
}
