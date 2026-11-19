"use client"

import { createContext, useCallback, useContext, useMemo } from "react"

import {
  useRawLabelPrintFlow,
  type LabelPrintJob,
} from "@/components/label-print-flow"
import { printBagLabels } from "@/lib/print-service"
import { unitErrorText } from "@/modules/blood-bank/units/error-messages"
import { usePrintUnitLabels } from "@/modules/blood-bank/units/queries"
import type { LoggedUnitLabel } from "@/modules/blood-bank/units/types"

export type UnitLabelPrintRequest = LabelPrintJob & {
  /** The case the units' bag was collected for. */
  caseId: number
  unitIds: number[]
}

type UnitLabelPrinterValue = {
  print: (request: UnitLabelPrintRequest) => void
  /** Sends labels another call already logged (Collect's `collected_units`) to the printer. */
  printLogged: (labels: LoggedUnitLabel[]) => void
  isPrinting: boolean
}

const UnitLabelPrinterContext = createContext<UnitLabelPrinterValue | null>(
  null
)

const labelCount = (request: UnitLabelPrintRequest) => request.unitIds.length

const jobName = (labels: LoggedUnitLabel[]) =>
  `Unit labels ${labels.map((label) => label.unit_no).join(", ")}`

/**
 * Unit label printing for everything inside it (see `useRawLabelPrintFlow`): logs the print,
 * asks for a reprint reason when needed, then sends the backend's label commands (one per
 * unit, in response order: the patient label or the storage label) to the label printer.
 */
export function UnitLabelPrinter({ children }: { children: React.ReactNode }) {
  const { mutate, isPending } = usePrintUnitLabels()

  const send = useCallback(
    (
      request: UnitLabelPrintRequest,
      reprintReason: string | undefined,
      callbacks: {
        onSuccess: (labels: LoggedUnitLabel[]) => void
        onError: (error: unknown) => void
      }
    ) =>
      mutate(
        { caseId: request.caseId, unitIds: request.unitIds, reprintReason },
        callbacks
      ),
    [mutate]
  )

  const { print, sendToPrinter, isPrinting, element } = useRawLabelPrintFlow({
    send,
    isPending,
    labelCount,
    errorText: unitErrorText,
    printCommands: printBagLabels,
    jobName,
  })

  const printLogged = useCallback(
    (labels: LoggedUnitLabel[]) => {
      void sendToPrinter(labels)
    },
    [sendToPrinter]
  )

  const value = useMemo(
    () => ({ print, printLogged, isPrinting }),
    [print, printLogged, isPrinting]
  )

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
