"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"
import { toast } from "sonner"

import {
  useLoggedLabelPrint,
  type LabelPrintJob,
} from "@/components/label-print-flow"
import { printLabelCommands, printServiceErrorText } from "@/lib/print-service"
import { sampleErrorText } from "@/modules/blood-bank/samples/error-messages"
import { usePrintSampleLabels } from "@/modules/blood-bank/samples/queries"
import type {
  SampleCollection,
  SampleLabel,
} from "@/modules/blood-bank/samples/types"

export type LabelPrintRequest = LabelPrintJob & {
  caseId: number
  sampleIds: number[]
}

/** A logged label ready for the printer. */
type LoggedLabel = { sample_no: string; label_command: string }

type SampleLabelPrinterValue = {
  /** Logs the print (asking for a reprint reason when needed), then prints. */
  print: (request: LabelPrintRequest) => void
  /** Prints the labels a Collect response returned; the backend already logged them. */
  printCollected: (view: SampleCollection) => void
  isPrinting: boolean
}

const SampleLabelPrinterContext = createContext<SampleLabelPrinterValue | null>(
  null
)

const labelCount = (request: LabelPrintRequest) => request.sampleIds.length

/** The collected samples' labels, in `collected_sample_ids` order. */
function collectedLabels(view: SampleCollection): LoggedLabel[] {
  return view.collected_sample_ids.flatMap((id) => {
    const sample = view.subjects.find(
      (subject) => subject.sample?.id === id
    )?.sample
    return sample?.label_command
      ? [{ sample_no: sample.sample_no, label_command: sample.label_command }]
      : []
  })
}

/**
 * Sample label printing for everything inside it: labels go to the workstation print service as
 * raw printer commands (one job per batch) on the barcode label printer. Every print is logged
 * by the backend before it reaches the printer, so a failed print can only be repeated as a
 * reprint (with a reason) from the row's Label button.
 */
export function SampleLabelPrinter({
  children,
}: {
  children: React.ReactNode
}) {
  const { mutate, isPending } = usePrintSampleLabels()
  const [isSending, setIsSending] = useState(false)

  const sendToPrinter = useCallback(async (labels: LoggedLabel[]) => {
    if (labels.length === 0) {
      return
    }
    setIsSending(true)
    try {
      await printLabelCommands(
        labels.map((label) => label.label_command),
        `Sample labels ${labels.map((label) => label.sample_no).join(", ")}`
      )
    } catch (error) {
      toast.error(
        labels.length === 1 ? "Label not printed" : "Labels not printed",
        {
          description: `${printServiceErrorText(error, "label")} Print again with the row's Label button (a reprint reason is needed).`,
          duration: 15_000,
        }
      )
    } finally {
      setIsSending(false)
    }
  }, [])

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

  const { print, element } = useLoggedLabelPrint({
    send,
    isPending,
    labelCount,
    errorText: sampleErrorText,
    onLogged: sendToPrinter,
  })

  const printCollected = useCallback(
    (view: SampleCollection) => {
      void sendToPrinter(collectedLabels(view))
    },
    [sendToPrinter]
  )

  const value = useMemo(
    () => ({ print, printCollected, isPrinting: isPending || isSending }),
    [print, printCollected, isPending, isSending]
  )

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
