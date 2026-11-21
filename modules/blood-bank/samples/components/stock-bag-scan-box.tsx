"use client"

import { PackageIcon } from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"

import { Form } from "@/components/form"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { isApiError } from "@/lib/api-error"
import {
  SampleErrorCode,
  sampleErrorText,
} from "@/modules/blood-bank/samples/error-messages"
import { useCheckStockUnit } from "@/modules/blood-bank/samples/queries"
import type { StockUnitInfo } from "@/modules/blood-bank/samples/types"

/** Errors about the scanned bag itself: shown under the input so the next scan can follow. */
const unitErrorCodes: readonly string[] = [
  SampleErrorCode.UnitNotFound,
  SampleErrorCode.UnitNotAvailable,
  SampleErrorCode.UnitAlreadyInCase,
  SampleErrorCode.UnitExpired,
  SampleErrorCode.UnitNotNeeded,
]

/**
 * "Add stock bag": scan the unit no of a stock bag the patient will get. The backend checks it
 * (nothing is written) and `onFound` lists it on the screen; Collect then adds it to the case,
 * holds it and draws its sample. Enter (typed, or a scanner's suffix) checks; there is no
 * button. `listedUnitNos` are bags already listed, refused here without a request.
 */
export function StockBagScanBox({
  caseId,
  listedUnitNos,
  onFound,
}: {
  caseId: number
  listedUnitNos: readonly string[]
  onFound: (unit: StockUnitInfo) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [unitNo, setUnitNo] = useState("")
  const [error, setError] = useState<string | null>(null)
  const check = useCheckStockUnit(caseId)

  function select() {
    inputRef.current?.focus()
    inputRef.current?.select()
  }

  function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    // No native submit: it would reload the page.
    event.preventDefault()
    const value = unitNo.trim()
    if (value === "" || check.isPending) {
      return
    }
    if (listedUnitNos.includes(value)) {
      setError("This bag is already listed.")
      select()
      return
    }

    check.mutate(value, {
      onSuccess: (unit) => {
        setUnitNo("")
        setError(null)
        onFound(unit)
        inputRef.current?.focus()
      },
      onError: (failure) => {
        if (isApiError(failure) && unitErrorCodes.includes(failure.code)) {
          setError(sampleErrorText(failure))
        } else {
          toast.error(sampleErrorText(failure))
        }
        select()
      },
    })
  }

  return (
    <Form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <Field data-invalid={error !== null}>
        <FieldLabel htmlFor="stock_bag_unit_no">Add stock bag</FieldLabel>
        <InputGroup>
          <InputGroupAddon>
            <PackageIcon />
          </InputGroupAddon>
          <InputGroupInput
            id="stock_bag_unit_no"
            ref={inputRef}
            value={unitNo}
            onChange={(event) => {
              setUnitNo(event.target.value)
              setError(null)
            }}
            placeholder="Unit no, then Enter"
            autoComplete="nope"
            spellCheck={false}
            maxLength={50}
            aria-invalid={error !== null}
            aria-busy={check.isPending}
          />
          {check.isPending ? (
            <InputGroupAddon align="inline-end">
              <Spinner />
            </InputGroupAddon>
          ) : null}
        </InputGroup>
        {error ? <FieldError>{error}</FieldError> : null}
      </Field>
    </Form>
  )
}
