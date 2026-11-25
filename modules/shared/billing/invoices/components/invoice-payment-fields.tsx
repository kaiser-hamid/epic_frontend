"use client"

import { addYears } from "date-fns"
import { useEffect, useState } from "react"
import { Controller, useFormContext, useWatch } from "react-hook-form"

import { DateTimePicker } from "@/components/date-time-picker"
import { Money } from "@/components/money"
import { NumberInput } from "@/components/number-input"
import { RequiredMark } from "@/components/required-mark"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { cn } from "@/lib/utils"
import { useInvoiceFormQuote } from "@/modules/shared/billing/invoices/components/invoice-totals"
import {
  MAX_TAKA,
  type InvoiceValues,
} from "@/modules/shared/billing/invoices/schemas"

/**
 * When the reports will be ready; printed on every copy of the bill. Date and time sit in one
 * box, each picked from its own list: the calendar offers today up to a year ahead (Dhaka).
 */
export function InvoiceDeliveryField() {
  const { control } = useFormContext<InvoiceValues>()
  const [[today, lastDay]] = useState(() => {
    const now = new Date()
    return [now, addYears(now, 1)] as const
  })

  return (
    <Controller
      name="delivery_at"
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor="delivery_at">
            Delivery date
            <RequiredMark />
          </FieldLabel>
          <DateTimePicker
            id="delivery_at"
            ref={field.ref}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            min={today}
            max={lastDay}
            invalid={fieldState.invalid}
            className="sm:max-w-80"
          />
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}

/**
 * Paid amount, Given and Change on one line, in whole taka. Paid follows the server's payable
 * until the user types in it; Change is Given − Paid. Only Paid is saved; Given and Change help
 * the counter count the cash. The due shows with the totals.
 */
export function InvoicePaymentFields() {
  const { control, setValue, getFieldState } = useFormContext<InvoiceValues>()
  const { shown } = useInvoiceFormQuote()
  const [paidEdited, setPaidEdited] = useState(false)
  const [paid, given] = useWatch({
    control,
    name: ["paid_amount", "given_amount"],
  })
  const payable =
    shown === undefined ? undefined : Math.floor(shown.amount / 100)

  useEffect(() => {
    if (!paidEdited && payable !== undefined) {
      setValue("paid_amount", payable, {
        shouldValidate: getFieldState("paid_amount").invalid,
      })
    }
  }, [paidEdited, payable, setValue, getFieldState])

  const change =
    given === undefined || paid === undefined ? undefined : given - paid

  return (
    <div className="grid grid-cols-3 gap-3">
      <Controller
        name="paid_amount"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="paid_amount">
              Paid amount
              <RequiredMark />
            </FieldLabel>
            <NumberInput
              id="paid_amount"
              name={field.name}
              ref={field.ref}
              value={field.value}
              onChange={(next) => {
                setPaidEdited(true)
                field.onChange(next)
              }}
              onBlur={field.onBlur}
              max={MAX_TAKA}
              aria-invalid={fieldState.invalid}
            />
            {payable !== undefined && paid !== undefined && paid > payable ? (
              <FieldDescription className="text-destructive">
                More than the payable (<Money paisa={payable * 100} />
                ).
              </FieldDescription>
            ) : null}
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <Controller
        name="given_amount"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="given_amount">Given</FieldLabel>
            <NumberInput
              id="given_amount"
              name={field.name}
              ref={field.ref}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              max={MAX_TAKA}
              aria-invalid={fieldState.invalid}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <Field>
        <FieldLabel htmlFor="change_amount">Change</FieldLabel>
        <ReadOnlyTaka id="change_amount" taka={change} />
        {change !== undefined && change < 0 ? (
          <FieldDescription className="text-destructive">
            Given is less than the paid amount.
          </FieldDescription>
        ) : null}
      </Field>
    </div>
  )
}

/** A worked-out amount shown like an input; "—" until it can be worked out, red when negative. */
function ReadOnlyTaka({ id, taka }: { id: string; taka: number | undefined }) {
  return (
    <output
      id={id}
      aria-live="polite"
      className={cn(
        "flex h-9 items-center rounded-md border bg-muted/50 px-3 text-sm",
        taka !== undefined && taka < 0 && "text-destructive"
      )}
    >
      {taka === undefined ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        <Money paisa={taka * 100} />
      )}
    </output>
  )
}
