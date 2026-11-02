"use client"

import { createContext, useCallback, useContext, useMemo } from "react"

import {
  useLabelPrintFlow,
  type LabelPrintJob,
} from "@/components/label-print-flow"
import {
  UnitLabelCard,
  unitLabelPageStyle,
} from "@/modules/blood-bank/units/components/unit-label"
import { unitErrorText } from "@/modules/blood-bank/units/error-messages"
import { usePrintUnitLabels } from "@/modules/blood-bank/units/queries"
import type { UnitLabel } from "@/modules/blood-bank/units/types"

export type UnitLabelPrintRequest = LabelPrintJob & {
  caseId: number
  unitIds: number[]
}

type UnitLabelPrinterValue = {
  print: (request: UnitLabelPrintRequest) => void
  isPrinting: boolean
}

const UnitLabelPrinterContext = createContext<UnitLabelPrinterValue | null>(
  null
)

const labelCount = (request: UnitLabelPrintRequest) => request.unitIds.length

const renderLabels = (labels: UnitLabel[]) =>
  labels.map((label) => <UnitLabelCard key={label.id} label={label} />)

/**
 * Component label printing for everything inside it (see `useLabelPrintFlow`): logs the
 * print, asks for a reprint reason when needed, then prints one label per unit.
 */
export function UnitLabelPrinter({ children }: { children: React.ReactNode }) {
  const { mutate, isPending } = usePrintUnitLabels()

  const send = useCallback(
    (
      request: UnitLabelPrintRequest,
      reprintReason: string | undefined,
      callbacks: {
        onSuccess: (labels: UnitLabel[]) => void
        onError: (error: unknown) => void
      }
    ) =>
      mutate(
        { caseId: request.caseId, unitIds: request.unitIds, reprintReason },
        callbacks
      ),
    [mutate]
  )

  const { print, isPrinting, element } = useLabelPrintFlow({
    send,
    isPending,
    labelCount,
    errorText: unitErrorText,
    documentTitle: "Component labels",
    pageStyle: unitLabelPageStyle,
    renderLabels,
  })

  const value = useMemo(() => ({ print, isPrinting }), [print, isPrinting])

  return (
    <UnitLabelPrinterContext value={value}>
      {children}
      {element}
    </UnitLabelPrinterContext>
  )
}

export function useUnitLabelPrinter(): UnitLabelPrinterValue {
  const value = useContext(UnitLabelPrinterContext)
  if (!value) {
    throw new Error("useUnitLabelPrinter must be used inside UnitLabelPrinter")
  }
  return value
}
