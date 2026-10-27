"use client"

import { BanIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { ReasonDialog } from "@/components/reason-dialog"
import { Button } from "@/components/ui/button"
import { errorMessage, isApiError } from "@/lib/api-error"
import { caseErrorMessages } from "@/modules/blood-bank/cases/error-messages"
import { useCancelCase } from "@/modules/blood-bank/cases/queries"
import type { BloodBankCase } from "@/modules/blood-bank/cases/types"

/** Status action instead of delete. Rendered only when `abilities.cancel` is true. */
export function CaseCancelButton({ record }: { record: BloodBankCase }) {
  const [open, setOpen] = useState(false)
  const cancelCase = useCancelCase(record.id)

  if (!record.abilities.cancel) {
    return null
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        <BanIcon data-icon="inline-start" />
        Cancel case
      </Button>
      <ReasonDialog
        open={open}
        onOpenChange={setOpen}
        title={`Cancel case ${record.case_no}?`}
        description="The case is kept for audit and marked cancelled."
        confirmLabel="Cancel case"
        destructive
        pending={cancelCase.isPending}
        error={cancelCase.error}
        onConfirm={(reason) =>
          cancelCase.mutate(reason, {
            onSuccess: () => {
              setOpen(false)
              toast.success(`Case ${record.case_no} cancelled`)
            },
            onError: (error) => {
              // Validation errors are shown under the reason field by ReasonDialog.
              if (!isApiError(error) || !error.isValidation) {
                toast.error(errorMessage(error, caseErrorMessages))
              }
            },
          })
        }
      />
    </>
  )
}
