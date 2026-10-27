"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"

import { Form } from "@/components/form"
import { Button } from "@/components/ui/button"
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
import { applyServerErrors } from "@/lib/form-errors"

const reasonSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "Enter a reason (at least 3 characters).")
    .max(1000),
})

type ReasonValues = z.infer<typeof reasonSchema>

type ReasonDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  label?: string
  confirmLabel?: string
  destructive?: boolean
  pending?: boolean
  /** Server validation errors on `reason` are shown under the field. */
  error?: unknown
  onConfirm: (reason: string) => void
}

/**
 * For actions where the backend requires a reason: cancellations, discards,
 * amendments, reprints (REPRINT_REASON_REQUIRED), safety overrides.
 */
export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  label = "Reason",
  confirmLabel = "Confirm",
  destructive = false,
  pending = false,
  error,
  onConfirm,
}: ReasonDialogProps) {
  const form = useForm<ReasonValues>({
    resolver: zodResolver(reasonSchema),
    defaultValues: { reason: "" },
  })

  useEffect(() => {
    if (!open) {
      form.reset()
    }
  }, [open, form])

  useEffect(() => {
    applyServerErrors(error, form.setError)
  }, [error, form.setError])

  return (
    <Dialog open={open} onOpenChange={pending ? undefined : onOpenChange}>
      <DialogContent>
        <Form
          onSubmit={form.handleSubmit((values) => onConfirm(values.reason))}
          className="flex flex-col gap-4"
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? (
              <DialogDescription>{description}</DialogDescription>
            ) : null}
          </DialogHeader>

          <Controller
            name="reason"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="reason">{label}</FieldLabel>
                <Textarea
                  {...field}
                  id="reason"
                  rows={3}
                  autoFocus
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
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={destructive ? "destructive" : "default"}
              disabled={pending}
            >
              {pending ? <Spinner /> : null}
              {confirmLabel}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
