"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { SaveIcon } from "lucide-react"
import { useEffect, useMemo } from "react"
import { Controller, FormProvider, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Form } from "@/components/form"
import { RequiredMark } from "@/components/required-mark"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { hasErrorCode, isApiError } from "@/lib/api-error"
import {
  AddDonorErrorCode,
  addDonorErrorMessages,
  addDonorErrorText,
  addDonorInvoiceErrorCodes,
} from "@/modules/blood-bank/case-donors/error-messages"
import { useAddCaseDonor } from "@/modules/blood-bank/case-donors/queries"
import {
  ALREADY_ON_CASE_TEXT,
  addDonorSchema,
  applyAddDonorErrors,
  emptyAddDonorValues,
  type AddDonorValues,
} from "@/modules/blood-bank/case-donors/schemas"
import { CaseDonorEntry } from "@/modules/blood-bank/cases/components/case-donors-fields"
import type { BloodBankCase } from "@/modules/blood-bank/cases/types"
import { BloodBankPermission } from "@/modules/blood-bank/permissions"
import { useCan } from "@/modules/shared/rbac/use-can"

/**
 * One donor for an open case, under a bill already saved in Billing for the case's patient (the
 * case bill, or e.g. an additional donor charge bill). Nothing is billed here. The parent
 * remounts the form after a save (its key follows the donor count), which clears it for the
 * next donor.
 */
export function AddDonorForm({
  record,
  invoiceNo,
}: {
  record: BloodBankCase
  /** The scanned invoice the page is opened with (its cache key). */
  invoiceNo: string
}) {
  const addDonor = useAddCaseDonor(invoiceNo)
  const canLookup = useCan(BloodBankPermission.DonorView)
  const existingDonorIds = useMemo(
    () => new Set((record.donors ?? []).map((entry) => entry.donor.id)),
    [record.donors]
  )
  const form = useForm<AddDonorValues>({
    resolver: zodResolver(addDonorSchema(existingDonorIds)),
    defaultValues: emptyAddDonorValues,
  })
  const { control } = form

  // Ready for the next invoice once the case is loaded or a donor was just added.
  useEffect(() => {
    form.setFocus("invoice_no")
  }, [form])

  function onSubmit(values: AddDonorValues) {
    if (addDonor.isPending) {
      return
    }
    addDonor.mutate(
      { caseId: record.id, values },
      {
        onSuccess: () => {
          toast.success("Donor added")
        },
        onError: (error) => {
          if (
            isApiError(error) &&
            addDonorInvoiceErrorCodes.includes(error.code)
          ) {
            form.setError(
              "invoice_no",
              { type: "server", message: addDonorErrorMessages[error.code] },
              { shouldFocus: true }
            )
          } else if (
            hasErrorCode(error, AddDonorErrorCode.DonorAlreadyInCase)
          ) {
            form.setError("donors.0.donor_id", {
              type: "server",
              message: addDonorErrorMessages[error.code],
            })
          } else if (!applyAddDonorErrors(error, form.setError)) {
            // `CASE_NOT_OPEN` also reloads the case (mutation hook), which hides the form.
            toast.error(addDonorErrorText(error))
          }
        },
      }
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add donor</CardTitle>
      </CardHeader>
      <CardContent>
        <FormProvider {...form}>
          <Form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            aria-label="Add donor"
          >
            <Controller
              name="invoice_no"
              control={control}
              render={({ field, fieldState }) => (
                <Field
                  data-invalid={fieldState.invalid}
                  className="sm:max-w-xs"
                >
                  <FieldLabel htmlFor="add_donor_invoice_no">
                    Invoice no
                    <RequiredMark />
                  </FieldLabel>
                  <Input
                    id="add_donor_invoice_no"
                    name={field.name}
                    ref={field.ref}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    maxLength={30}
                    autoComplete="off"
                    spellCheck={false}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldDescription>
                    A bill saved in Billing for this patient.
                  </FieldDescription>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <CaseDonorEntry
              index={0}
              title="Donor"
              canLookup={canLookup}
              blockedReason={(donor) =>
                existingDonorIds.has(donor.id) ? ALREADY_ON_CASE_TEXT : null
              }
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={addDonor.isPending}>
                {addDonor.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <SaveIcon data-icon="inline-start" />
                )}
                Save
              </Button>
            </div>
          </Form>
        </FormProvider>
      </CardContent>
    </Card>
  )
}
