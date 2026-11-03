"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { PrinterIcon } from "lucide-react"
import { Controller, useForm, type UseFormSetError } from "react-hook-form"
import { toast } from "sonner"

import { Form } from "@/components/form"
import { RequiredMark } from "@/components/required-mark"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { ErrorCode, hasErrorCode } from "@/lib/api-error"
import { applyServerErrors } from "@/lib/form-errors"
import {
  bloodIssueErrorMessages,
  bloodIssueErrorText,
} from "@/modules/blood-bank/blood-issue/error-messages"
import { usePrintCompatibilityReports } from "@/modules/blood-bank/blood-issue/queries"
import {
  REPRINT_REASON_MAX,
  reprintSchema,
  type ReprintOutput,
  type ReprintValues,
} from "@/modules/blood-bank/blood-issue/schemas"
import type { IssueUnit, PdfFile } from "@/modules/blood-bank/blood-issue/types"

/**
 * Reprints the Compatibility Test Report of one or more units (those with a crossmatch). Every
 * reprint needs a reason. `onPrinted` gets the PDF.
 */
export function ReprintDialog({
  caseId,
  units,
  initialUnitIds,
  open,
  onOpenChange,
  onPrinted,
}: {
  caseId: number
  /** Units whose report can be reprinted. */
  units: IssueUnit[]
  /** Ticked when the dialog opens. */
  initialUnitIds: number[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onPrinted: (pdf: PdfFile) => void
}) {
  const reprint = usePrintCompatibilityReports(caseId)

  return (
    <Dialog
      open={open}
      onOpenChange={reprint.isPending ? undefined : onOpenChange}
    >
      <DialogContent className="sm:max-w-lg">
        {open ? (
          <ReprintForm
            units={units}
            initialUnitIds={initialUnitIds}
            isPending={reprint.isPending}
            onCancel={() => onOpenChange(false)}
            onSubmit={(values, setError) => {
              if (reprint.isPending) {
                return
              }
              reprint.mutate(
                {
                  unit_ids: values.unit_ids,
                  reprint_reason: values.reprint_reason,
                },
                {
                  onSuccess: onPrinted,
                  onError: (error) => {
                    if (hasErrorCode(error, ErrorCode.ReprintReasonRequired)) {
                      setError(
                        "reprint_reason",
                        {
                          type: "server",
                          message:
                            bloodIssueErrorMessages[
                              ErrorCode.ReprintReasonRequired
                            ],
                        },
                        { shouldFocus: true }
                      )
                      return
                    }
                    if (!applyServerErrors(error, setError)) {
                      toast.error(bloodIssueErrorText(error))
                    }
                  },
                }
              )
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function ReprintForm({
  units,
  initialUnitIds,
  isPending,
  onCancel,
  onSubmit,
}: {
  units: IssueUnit[]
  initialUnitIds: number[]
  isPending: boolean
  onCancel: () => void
  onSubmit: (
    values: ReprintOutput,
    setError: UseFormSetError<ReprintValues>
  ) => void
}) {
  const form = useForm<ReprintValues, unknown, ReprintOutput>({
    resolver: zodResolver(reprintSchema),
    defaultValues: { unit_ids: initialUnitIds, reprint_reason: "" },
  })

  return (
    <Form
      onSubmit={form.handleSubmit((values) => onSubmit(values, form.setError))}
      className="flex flex-col gap-4"
      aria-label="Reprint report"
    >
      <DialogHeader>
        <DialogTitle>Reprint Compatibility Test Report</DialogTitle>
        <DialogDescription>
          The reprint is marked &ldquo;REPRINT&rdquo; and logged with the
          reason.
        </DialogDescription>
      </DialogHeader>

      <Controller
        name="unit_ids"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <span id="reprint_units_label" className="text-sm font-medium">
              Units
            </span>
            <div
              role="group"
              aria-labelledby="reprint_units_label"
              className="flex flex-col gap-2 rounded-lg border p-3"
            >
              {units.map((unit) => {
                const checked = field.value.includes(unit.id)
                return (
                  <label
                    key={unit.id}
                    htmlFor={`reprint_unit_${unit.id}`}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      id={`reprint_unit_${unit.id}`}
                      checked={checked}
                      onCheckedChange={(next) =>
                        field.onChange(
                          next === true
                            ? units
                                .map((candidate) => candidate.id)
                                .filter(
                                  (id) =>
                                    id === unit.id || field.value.includes(id)
                                )
                            : field.value.filter((id) => id !== unit.id)
                        )
                      }
                    />
                    <span className="font-medium">{unit.unit_no}</span>
                    <span className="text-muted-foreground">
                      {unit.component.code} · printed{" "}
                      {unit.compatibility_report_print_count}×
                    </span>
                  </label>
                )
              })}
            </div>
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <Controller
        name="reprint_reason"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="reprint_reason">
              Reason
              <RequiredMark />
            </FieldLabel>
            <Textarea
              {...field}
              id="reprint_reason"
              rows={3}
              autoFocus
              maxLength={REPRINT_REASON_MAX}
              aria-invalid={fieldState.invalid}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <PrinterIcon data-icon="inline-start" />
          )}
          Reprint
        </Button>
      </DialogFooter>
    </Form>
  )
}
