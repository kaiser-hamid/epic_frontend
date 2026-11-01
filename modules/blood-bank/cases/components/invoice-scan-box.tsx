"use client"

import { ScanBarcodeIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Form } from "@/components/form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { ErrorCode, hasErrorCode } from "@/lib/api-error"

/** The `CASE_NOT_FOUND` code the invoice lookups answer with when no case matches. */
const CASE_NOT_FOUND = "CASE_NOT_FOUND"

type InvoiceLookup = {
  isPending: boolean
  mutate: (
    invoiceNo: string,
    options: {
      onSuccess: (view: { case: { id: number } }) => void
      onError: (error: unknown) => void
    }
  ) => void
}

/**
 * Invoice scan box shared by the Sample Collection and Donor Examination screens: Enter
 * (typed, or a scanner's suffix) looks the invoice up; there is no button. `errorText`
 * turns an API error into the screen's own message.
 */
export function InvoiceScanBox({
  scanRef,
  title,
  lookup,
  errorText,
  onCaseChange,
}: {
  scanRef: React.RefObject<HTMLInputElement | null>
  title: string
  lookup: InvoiceLookup
  errorText: (error: unknown) => string
  onCaseChange: (caseId: number | null) => void
}) {
  const [invoiceNo, setInvoiceNo] = useState("")
  const [lookupError, setLookupError] = useState<string | null>(null)

  function selectScan() {
    scanRef.current?.select()
  }

  function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = invoiceNo.trim()
    if (value === "" || lookup.isPending) {
      return
    }

    lookup.mutate(value, {
      onSuccess: (view) => {
        setLookupError(null)
        onCaseChange(view.case.id)
        selectScan()
      },
      onError: (error) => {
        if (hasErrorCode(error, CASE_NOT_FOUND)) {
          onCaseChange(null)
          setLookupError(errorText(error))
        } else if (hasErrorCode(error, ErrorCode.ValidationFailed)) {
          setLookupError(errorText(error))
        } else {
          toast.error(errorText(error))
        }
        selectScan()
      },
    })
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Field data-invalid={lookupError !== null}>
            <FieldLabel htmlFor="scan_invoice_no">Invoice no</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <ScanBarcodeIcon />
              </InputGroupAddon>
              <InputGroupInput
                id="scan_invoice_no"
                ref={scanRef}
                value={invoiceNo}
                onChange={(event) => {
                  setInvoiceNo(event.target.value)
                  setLookupError(null)
                }}
                placeholder="Scan or type, then Enter"
                autoComplete="off"
                spellCheck={false}
                maxLength={30}
                aria-invalid={lookupError !== null}
                aria-busy={lookup.isPending}
              />
              {lookup.isPending ? (
                <InputGroupAddon align="inline-end">
                  <Spinner />
                </InputGroupAddon>
              ) : null}
            </InputGroup>
            {lookupError ? <FieldError>{lookupError}</FieldError> : null}
          </Field>

          {/*
            The case no replaces the invoice no once the vendor billing system is retired
            (the backend lookup takes `case_no` then).
          <Field>
            <FieldLabel htmlFor="scan_case_no">Case no</FieldLabel>
            <Input id="scan_case_no" placeholder="Scan or type" autoComplete="off" />
          </Field>
          */}
        </Form>
      </CardContent>
    </Card>
  )
}
