"use client"

import { createContext, useCallback, useContext, useMemo } from "react"

import {
  useLabelPrintFlow,
  type LabelPrintJob,
} from "@/components/label-print-flow"
import {
  BagLabelCard,
  bagLabelPageStyle,
} from "@/modules/blood-bank/blood-collections/components/bag-label"
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

const renderLabels = (labels: BagLabel[]) =>
  labels.map((label) => <BagLabelCard key={label.id} label={label} />)

/**
 * Bag label printing for everything inside it (see `useLabelPrintFlow`): logs the print,
 * asks for a reprint reason when needed, then prints.
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

  const { print, isPrinting, element } = useLabelPrintFlow({
    send,
    isPending,
    labelCount,
    errorText: bloodCollectionErrorText,
    documentTitle: "Bag labels",
    pageStyle: bagLabelPageStyle,
    renderLabels,
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
