"use client"

import { useMemo } from "react"
import { useFormContext, useWatch } from "react-hook-form"

import { Money } from "@/components/money"
import { Spinner } from "@/components/ui/spinner"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { cn } from "@/lib/utils"
import {
  billedLines,
  type QuoteInput,
} from "@/modules/shared/billing/invoices/api"
import { useInvoiceQuote } from "@/modules/shared/billing/invoices/queries"
import type { InvoiceValues } from "@/modules/shared/billing/invoices/schemas"
import type { InvoiceQuote } from "@/modules/shared/billing/invoices/types"

/**
 * The server's totals for the bill being filled in (`/invoices/quote`), refreshed shortly after
 * the tests, patient type or discount change. `shown` is undefined while there is nothing to
 * quote. Every caller shares one cached query.
 */
export function useInvoiceFormQuote() {
  const { control } = useFormContext<InvoiceValues>()
  const [items, patientTypeId, discountPolicyId] = useWatch({
    control,
    name: ["items", "patient_type_id", "discount_policy_id"],
  })
  const lines = billedLines(items)
  // Debounced as a string: a fresh object every render would never settle.
  const inputKey = useDebouncedValue(
    patientTypeId === undefined || lines.length === 0
      ? ""
      : JSON.stringify({
          items: lines,
          patient_type_id: patientTypeId,
          discount_policy_id: discountPolicyId,
        }),
    300
  )
  const input = useMemo(
    () => (inputKey === "" ? null : (JSON.parse(inputKey) as QuoteInput)),
    [inputKey]
  )
  const quote = useInvoiceQuote(input)
  const shown: InvoiceQuote | undefined =
    input === null ? undefined : quote.data

  return { quote, shown }
}

/**
 * Subtotal, discount and payable as the server would bill them, plus what stays due after the
 * paid amount typed below. The totals are never computed here.
 */
export function InvoiceTotals() {
  const { control } = useFormContext<InvoiceValues>()
  const paid = useWatch({ control, name: "paid_amount" })
  const { quote, shown } = useInvoiceFormQuote()
  const due =
    shown === undefined || paid === undefined
      ? undefined
      : shown.amount - paid * 100
  // Red while the patient still owes something; overpaying is flagged on Paid amount itself.
  const isOwed = due !== undefined && due > 0

  return (
    <dl className="ml-auto grid w-full max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-sm">
      <dt className="text-muted-foreground">Subtotal</dt>
      <dd className="text-right">
        <Money paisa={shown?.subtotal_amount ?? 0} />
      </dd>
      <dt className="text-muted-foreground">
        Discount
        {shown?.discount_policy ? ` (${shown.discount_policy.name})` : ""}
      </dt>
      <dd className="text-right">
        − <Money paisa={shown?.discount_amount ?? 0} />
      </dd>
      <dt className="flex items-center gap-2 border-t pt-1.5 font-medium">
        Payable
        {quote.isFetching ? <Spinner className="size-3" /> : null}
      </dt>
      <dd className="border-t pt-1.5 text-right text-base font-semibold">
        <Money paisa={shown?.amount ?? 0} />
      </dd>
      <dt
        className={cn(
          "border-t pt-1.5 font-medium",
          isOwed && "text-destructive"
        )}
      >
        Due
      </dt>
      <dd
        className={cn(
          "border-t pt-1.5 text-right font-semibold",
          isOwed && "text-destructive"
        )}
      >
        <Money paisa={due ?? 0} />
      </dd>
      {quote.isError ? (
        <dd className="col-span-2 text-xs text-destructive">
          Totals could not be calculated. They are calculated again on save.
        </dd>
      ) : null}
    </dl>
  )
}
