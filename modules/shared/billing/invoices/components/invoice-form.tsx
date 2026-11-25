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
import {
  InvoiceDeliveryField,
  InvoicePaymentFields,
} from "@/modules/shared/billing/invoices/components/invoice-payment-fields"
import { InvoiceReferralFields } from "@/modules/shared/billing/invoices/components/invoice-referral-fields"
import { InvoiceTestItemsFields } from "@/modules/shared/billing/invoices/components/invoice-test-items-fields"
import { InvoiceTotals } from "@/modules/shared/billing/invoices/components/invoice-totals"
import { printSavedInvoice } from "@/modules/shared/billing/invoices/components/send-invoice"
import {
  InvoiceErrorCode,
  invoiceErrorMessages,
} from "@/modules/shared/billing/invoices/error-messages"
import { useCreateInvoice } from "@/modules/shared/billing/invoices/queries"
import {
  defaultDeliveryAt,
  emptyInvoiceValues,
  invoiceCategories,
  invoiceSchema,
  type InvoiceValues,
} from "@/modules/shared/billing/invoices/schemas"
import { SharedPermission } from "@/modules/shared/rbac/permissions"
import { useCan } from "@/modules/shared/rbac/use-can"
import {
  TestItemCategory,
  testItemCategoryLabels,
} from "@/modules/shared/test-catalog/enums"

/**
 * Fields an item category asks for besides the tests (Blood Bank: "Care of"), supplied by the
 * module that owns it. They write under `category_details.*` and are shown only while an item of
 * that category is on the bill.
 */
export type CategoryDetailsFields = Partial<
  Record<TestItemCategory, React.ReactNode>
>

/**
 * New Bill Entry. One save registers the patient (if new) and the bill, which may mix general and
 * Blood Bank items; with Blood Bank items it also opens their case. The saved bill is printed
 * straight away (Customer, Lab and Non-Lab Copies) for staff who may print, while the page moves
 * on to the bill. The page stays mounted when the user navigates away and back, so after a save
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
  const canPrint = useCan(SharedPermission.BillingPrint)
  // One per form session: a double click or a retry after a lost response returns the same bill.
  const [idempotencyKey] = useState(() => crypto.randomUUID())

  const form = useForm<InvoiceValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: { ...emptyInvoiceValues, delivery_at: defaultDeliveryAt() },
  })
  const lines = useWatch({ control: form.control, name: "items" })
  const detailCategories = invoiceCategories(lines).filter(
    (category) => categoryDetails[category] !== undefined
  )
  const hasDetails = detailCategories.length > 0

  // Details belong to the items that ask for them; without such items none are sent.
  useEffect(() => {
    if (!hasDetails) {
      form.setValue("category_details", {})
    }
  }, [hasDetails, form])

  function onSubmit(values: InvoiceValues) {
    if (createInvoice.isPending || createInvoice.isSuccess) {
      return
    }
    createInvoice.mutate(
      { values, idempotencyKey },
      {
        onSuccess: (record) => {
          toast.success(`Bill ${record.invoice_no} saved`)
          if (canPrint) {
            // Keeps running on the bill page; reports through toasts.
            void printSavedInvoice(record.id, record.invoice_no)
          }
          router.push(`/billing/invoices/${record.id}`)
          onSaved()
        },
        onError: (error) => {
          if (applyServerErrors(error, form.setError)) {
            return
          }
          const field = hasErrorCode(error, InvoiceErrorCode.InvoiceNoTaken)
            ? "invoice_no"
            : hasErrorCode(error, InvoiceErrorCode.PaidAmountExceedsPayable)
              ? "paid_amount"
              : null
          if (field !== null) {
            form.setError(
              field,
              {
                type: "server",
                message: errorMessage(error, invoiceErrorMessages),
              },
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

        {detailCategories.map((category) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle>{testItemCategoryLabels[category]}</CardTitle>
            </CardHeader>
            <CardContent>{categoryDetails[category]}</CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader>
            <CardTitle>Bill</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-[2fr_1fr] lg:items-start">
            <div className="flex flex-col gap-4">
              <InvoiceDiscountFields />
              <InvoiceDeliveryField />
              <TextControl
                name="invoice_no"
                label="Invoice no"
                description="Only for a bill already numbered by the vendor system. Leave empty to number it here."
                className="sm:max-w-xs"
              />
            </div>
            <div className="flex flex-col gap-6">
              <InvoiceTotals />
              <InvoicePaymentFields />
            </div>
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
