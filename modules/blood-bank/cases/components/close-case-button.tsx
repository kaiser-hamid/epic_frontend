"use client"

import { CircleCheckIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { ReasonDialog } from "@/components/reason-dialog"
import { Button } from "@/components/ui/button"
import { errorMessage } from "@/lib/api-error"
import { caseErrorMessages } from "@/modules/blood-bank/cases/error-messages"
import { useCloseCase } from "@/modules/blood-bank/cases/queries"
import type { BloodBankCase } from "@/modules/blood-bank/cases/types"

/**
 * "Close case" on the case details page, for a case that does not close by itself.
 * Shown while the backend says it can close (`closing.can_close`). With nothing
 * outstanding (only services billed) it just asks for confirmation; with billed work
 * outstanding the backend requires a reason, so it opens the reason dialog instead.
 */
export function CloseCaseButton({ record }: { record: BloodBankCase }) {
  const [open, setOpen] = useState(false)
  const closeCase = useCloseCase()

  if (!record.closing?.can_close) {
    return null
  }

  const needsReason = record.closing.needs_reason

  const submit = (reason: string | null) => {
    closeCase.mutate(
      { id: record.id, reason },
      {
        onSuccess: () => {
          setOpen(false)
          toast.success(`Case ${record.case_no} closed.`)
        },
        onError: (error) => {
          toast.error(errorMessage(error, caseErrorMessages))
        },
      }
    )
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <CircleCheckIcon data-icon="inline-start" />
        Close case
      </Button>
      {needsReason ? (
        <ReasonDialog
          open={open}
          onOpenChange={setOpen}
          title={`Close case ${record.case_no}?`}
          description="Billed work is still outstanding on this case (components not issued, or the procedure not done). Say why it is being closed; this is kept in the audit log."
          label="Reason for closing"
          confirmLabel="Close case"
          destructive
          pending={closeCase.isPending}
          error={closeCase.error}
          onConfirm={(reason) => submit(reason)}
        />
      ) : (
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title={`Close case ${record.case_no}?`}
          description="Nothing billed on this case is outstanding. Closing it removes it from the open cases; it cannot be reopened."
          confirmLabel="Close case"
          pending={closeCase.isPending}
          onConfirm={() => submit(null)}
        />
      )}
    </>
  )
}
