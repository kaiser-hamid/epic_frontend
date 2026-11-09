"use client"

import { addYears } from "date-fns"
import { useEffect, useState } from "react"
import { Controller, useFormContext, useWatch } from "react-hook-form"

import { DateInput } from "@/components/date-input"
import { Money } from "@/components/money"
import { NumberInput } from "@/components/number-input"
import { RequiredMark } from "@/components/required-mark"
import { TimePicker } from "@/components/time-picker"
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

/** `YYYY-MM-DDTHH:mm` → its date and time parts ("" when missing). */
function splitDateTime(value: string): { date: string; time: string } {
  const at = value.indexOf("T")
  return at === -1
    ? { date: value, time: "" }
    : { date: value.slice(0, at), time: value.slice(at + 1) }
}

/**
 * When the reports will be ready; printed on every copy of the bill. The form starts on today;
 * the calendar offers today up to a year ahead, and the time is picked from a list (Dhaka).
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
      render={({ field, fieldState }) => {
        const { date, time } = splitDateTime(field.value)
        const join = (nextDate: string, nextTime: string) =>
          nextDate === "" && nextTime === "" ? "" : `${nextDate}T${nextTime}`

        return (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="delivery_at">
              Delivery date
              <RequiredMark />
            </FieldLabel>
            <div className="flex gap-2 sm:max-w-80">
              <div className="min-w-0 flex-1">
                <DateInput
                  id="delivery_at"
                  name={field.name}
                  ref={field.ref}
                  value={date}
                  onChange={(nextDate) => field.onChange(join(nextDate, time))}
                  onBlur={field.onBlur}
                  min={today}
                  max={lastDay}
                  invalid={fieldState.invalid}
                />
              </div>
              <TimePicker
                id="delivery_at_time"
                value={time}
                onChange={(nextTime) => field.onChange(join(date, nextTime))}
                onBlur={field.onBlur}
                invalid={fieldState.invalid}
                className="w-36 shrink-0"
              />
            </div>
            <FieldError errors={[fieldState.error]} />
          </Field>
        )
      }}
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
