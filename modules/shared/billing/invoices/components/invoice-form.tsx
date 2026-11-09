"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { FormProvider, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { Form } from "@/components/form"
import { TextControl } from "@/components/form-controls"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { errorMessage, hasErrorCode } from "@/lib/api-error"
import { applyServerErrors } from "@/lib/form-errors"
import { InvoiceDiscountFields } from "@/modules/shared/billing/invoices/components/invoice-discount-fields"
import { InvoicePatientFields } from "@/modules/shared/billing/invoices/components/invoice-patient-fields"
import { InvoiceReferralFields } from "@/modules/shared/billing/invoices/components/invoice-referral-fields"
import { InvoiceTestItemsFields } from "@/modules/shared/billing/invoices/components/invoice-test-items-fields"
import { InvoiceTotals } from "@/modules/shared/billing/invoices/components/invoice-totals"
import {
  InvoiceErrorCode,
  invoiceErrorMessages,
} from "@/modules/shared/billing/invoices/error-messages"
import { useCreateInvoice } from "@/modules/shared/billing/invoices/queries"
import {
  emptyInvoiceValues,
  invoiceCategory,
  invoiceSchema,
  type InvoiceValues,
} from "@/modules/shared/billing/invoices/schemas"
import {
  TestItemCategory,
  testItemCategoryLabels,
} from "@/modules/shared/test-catalog/enums"

/**
 * Fields a kind of bill asks for besides the tests (Blood Bank: "Care of"), supplied by the
 * module that owns it. They write under `category_details.*` and are shown only while the bill
 * is of that kind.
 */
export type CategoryDetailsFields = Partial<
  Record<TestItemCategory, React.ReactNode>
>

/**
 * New Bill Entry. One save registers the patient (if new) and the bill; a Blood Bank bill also
 * opens its case. The page stays mounted when the user navigates away and back, so after a save
 * the form is remounted (new key), which drops every value and starts a new idempotency key.
 */
export function InvoiceForm({
  categoryDetails = {},
}: {
  categoryDetails?: CategoryDetailsFields
}) {
  const [session, setSession] = useState(0)
  return (
    <InvoiceEntryForm
      key={session}
      categoryDetails={categoryDetails}
      onSaved={() => setSession((current) => current + 1)}
    />
  )
}

function InvoiceEntryForm({
  categoryDetails,
  onSaved,
}: {
  categoryDetails: CategoryDetailsFields
  onSaved: () => void
}) {
  const router = useRouter()
  const createInvoice = useCreateInvoice()
  // One per form session: a double click or a retry after a lost response returns the same bill.
  const [idempotencyKey] = useState(() => crypto.randomUUID())

  const form = useForm<InvoiceValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: emptyInvoiceValues,
  })
  const lines = useWatch({ control: form.control, name: "items" })
  const category = invoiceCategory(lines)
  const details = categoryDetails[category]

  // Details belong to the bill's kind; a general bill sends none.
  useEffect(() => {
    if (category === TestItemCategory.General) {
      form.setValue("category_details", {})
    }
  }, [category, form])

  function onSubmit(values: InvoiceValues) {
    if (createInvoice.isPending || createInvoice.isSuccess) {
      return
    }
    createInvoice.mutate(
      { values, idempotencyKey },
      {
        onSuccess: (record) => {
          toast.success(`Bill ${record.invoice_no} saved`)
          router.push(`/billing/invoices/${record.id}`)
          onSaved()
        },
        onError: (error) => {
          if (applyServerErrors(error, form.setError)) {
            return
          }
          if (hasErrorCode(error, InvoiceErrorCode.InvoiceNoTaken)) {
            form.setError(
              "invoice_no",
              { type: "server", message: invoiceErrorMessages[error.code] },
              { shouldFocus: true }
            )
            return
          }
          toast.error(errorMessage(error, invoiceErrorMessages))
        },
      }
    )
  }

  return (
    <FormProvider {...form}>
      <Form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-6"
      >
        {/* DOM order is the Enter order: left column, then right, row by row. */}
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <Card>
            <CardHeader>
              <CardTitle>Patient</CardTitle>
            </CardHeader>
            <CardContent>
              <InvoicePatientFields />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Referral</CardTitle>
            </CardHeader>
            <CardContent>
              <InvoiceReferralFields />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tests</CardTitle>
            <CardDescription>
              Amounts use the current catalog rate; the server calculates the
              bill.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InvoiceTestItemsFields />
          </CardContent>
        </Card>

        {details ? (
          <Card>
            <CardHeader>
              <CardTitle>{testItemCategoryLabels[category]}</CardTitle>
            </CardHeader>
            <CardContent>{details}</CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Bill</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-[2fr_1fr] lg:items-start">
            <div className="flex flex-col gap-4">
              <InvoiceDiscountFields />
              <TextControl
                name="invoice_no"
                label="Invoice no"
                description="Only for a bill already numbered by the vendor system. Leave empty to number it here."
                className="sm:max-w-xs"
              />
            </div>
            <InvoiceTotals />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          {/* Stays disabled after success too: the page is on its way to the bill. */}
          <Button
            type="submit"
            disabled={createInvoice.isPending || createInvoice.isSuccess}
          >
            {createInvoice.isPending ? <Spinner /> : null}
            Save bill
          </Button>
        </div>
      </Form>
    </FormProvider>
  )
}
