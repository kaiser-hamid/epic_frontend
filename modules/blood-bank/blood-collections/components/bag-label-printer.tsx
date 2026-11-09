"use client"

import { createContext, useCallback, useContext, useMemo } from "react"

import {
  useRawLabelPrintFlow,
  type LabelPrintJob,
} from "@/components/label-print-flow"
import { printBagLabels } from "@/lib/print-service"
import { bloodCollectionErrorText } from "@/modules/blood-bank/blood-collections/error-messages"
import { usePrintBagLabels } from "@/modules/blood-bank/blood-collections/queries"
import type { BagLabel } from "@/modules/blood-bank/blood-collections/types"

export type BagLabelPrintRequest = LabelPrintJob & {
  caseId: number
  collectionIds: number[]
}

type BagLabelPrinterValue = {
  print: (request: BagLabelPrintRequest) => void
  isPrinting: boolean
}

const BagLabelPrinterContext = createContext<BagLabelPrinterValue | null>(null)

const labelCount = (request: BagLabelPrintRequest) =>
  request.collectionIds.length

const jobName = (labels: BagLabel[]) =>
  `Bag labels ${labels.map((label) => label.bag_no).join(", ")}`

/**
 * Bag label printing for everything inside it (see `useRawLabelPrintFlow`): logs the print,
 * asks for a reprint reason when needed, then sends the backend's label commands (one per bag,
 * in response order) to the label printer.
 */
export function BagLabelPrinter({ children }: { children: React.ReactNode }) {
  const { mutate, isPending } = usePrintBagLabels()

  const send = useCallback(
    (
      request: BagLabelPrintRequest,
      reprintReason: string | undefined,
      callbacks: {
        onSuccess: (labels: BagLabel[]) => void
        onError: (error: unknown) => void
      }
    ) =>
      mutate(
        {
          caseId: request.caseId,
          collectionIds: request.collectionIds,
          reprintReason,
        },
        callbacks
      ),
    [mutate]
  )

  const { print, isPrinting, element } = useRawLabelPrintFlow({
    send,
    isPending,
    labelCount,
    errorText: bloodCollectionErrorText,
    printCommands: printBagLabels,
    jobName,
  })

  const value = useMemo(() => ({ print, isPrinting }), [print, isPrinting])

  return (
    <BagLabelPrinterContext value={value}>
      {children}
      {element}
    </BagLabelPrinterContext>
  )
}

export function useBagLabelPrinter(): BagLabelPrinterValue {
  const value = useContext(BagLabelPrinterContext)
  if (!value) {
    throw new Error("useBagLabelPrinter must be used inside BagLabelPrinter")
  }
  return value
}
