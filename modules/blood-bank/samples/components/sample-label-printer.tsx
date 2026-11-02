"use client"

import { createContext, useCallback, useContext, useMemo } from "react"

import {
  useLabelPrintFlow,
  type LabelPrintJob,
} from "@/components/label-print-flow"
import {
  SampleLabelCard,
  sampleLabelPageStyle,
} from "@/modules/blood-bank/samples/components/sample-label"
import { sampleErrorText } from "@/modules/blood-bank/samples/error-messages"
import { usePrintSampleLabels } from "@/modules/blood-bank/samples/queries"
import type { SampleLabel } from "@/modules/blood-bank/samples/types"

export type LabelPrintRequest = LabelPrintJob & {
  caseId: number
  sampleIds: number[]
}

type SampleLabelPrinterValue = {
  print: (request: LabelPrintRequest) => void
  isPrinting: boolean
}

const SampleLabelPrinterContext = createContext<SampleLabelPrinterValue | null>(
  null
)

const labelCount = (request: LabelPrintRequest) => request.sampleIds.length

const renderLabels = (labels: SampleLabel[]) =>
  labels.map((label) => <SampleLabelCard key={label.id} label={label} />)

/**
 * Sample label printing for everything inside it (see `useLabelPrintFlow`): logs the print,
 * asks for a reprint reason when needed, then prints.
 */
export function SampleLabelPrinter({
  children,
}: {
  children: React.ReactNode
}) {
  const { mutate, isPending } = usePrintSampleLabels()

  const send = useCallback(
    (
      request: LabelPrintRequest,
      reprintReason: string | undefined,
      callbacks: {
        onSuccess: (labels: SampleLabel[]) => void
        onError: (error: unknown) => void
      }
    ) =>
      mutate(
        {
          caseId: request.caseId,
          sampleIds: request.sampleIds,
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
    errorText: sampleErrorText,
    documentTitle: "Sample labels",
    pageStyle: sampleLabelPageStyle,
    renderLabels,
  })

  const value = useMemo(() => ({ print, isPrinting }), [print, isPrinting])

  return (
    <SampleLabelPrinterContext value={value}>
      {children}
      {element}
    </SampleLabelPrinterContext>
  )
}

export function useSampleLabelPrinter(): SampleLabelPrinterValue {
  const value = useContext(SampleLabelPrinterContext)
  if (!value) {
    throw new Error(
      "useSampleLabelPrinter must be used inside SampleLabelPrinter"
    )
  }
  return value
}
