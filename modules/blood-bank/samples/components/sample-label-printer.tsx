"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useReactToPrint } from "react-to-print"
import { toast } from "sonner"

import { ReasonDialog } from "@/components/reason-dialog"
import { ErrorCode, hasErrorCode } from "@/lib/api-error"
import {
  SampleLabelCard,
  sampleLabelPageStyle,
} from "@/modules/blood-bank/samples/components/sample-label"
import { sampleErrorText } from "@/modules/blood-bank/samples/error-messages"
import { usePrintSampleLabels } from "@/modules/blood-bank/samples/queries"
import type { SampleLabel } from "@/modules/blood-bank/samples/types"

export type LabelPrintRequest = {
  caseId: number
  sampleIds: number[]
  /**
   * True when a label was printed before (`label_print_count > 0`): the reason is asked for
   * before calling the API. When unknown, pass false; a `REPRINT_REASON_REQUIRED` answer
   * opens the same dialog and retries.
   */
  isReprint: boolean
}

type SampleLabelPrinterValue = {
  print: (request: LabelPrintRequest) => void
  isPrinting: boolean
}

const SampleLabelPrinterContext = createContext<SampleLabelPrinterValue | null>(
  null
)

/**
 * Label printing for everything inside it: logs the print first, asks for a reprint reason
 * when needed, and prints the returned label content with react-to-print only after the log
 * succeeded.
 */
export function SampleLabelPrinter({
  children,
}: {
  children: React.ReactNode
}) {
  const mutation = usePrintSampleLabels()
  const { mutate } = mutation
  const [reasonFor, setReasonFor] = useState<LabelPrintRequest | null>(null)
  const [labels, setLabels] = useState<SampleLabel[] | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const printSheet = useReactToPrint({
    contentRef,
    documentTitle: "Sample labels",
    pageStyle: sampleLabelPageStyle,
    onAfterPrint: () => setLabels(null),
    onPrintError: () => {
      setLabels(null)
      toast.error("The labels could not be sent to the printer.")
    },
  })

  // The sheet (and its barcodes) has rendered by the time this runs. `printSheet` changes
  // identity on re-render, so the batch it was queued for is tracked to print it once.
  const queuedRef = useRef<SampleLabel[] | null>(null)
  useEffect(() => {
    if (labels && queuedRef.current === labels) {
      queuedRef.current = null
      printSheet()
    }
  }, [labels, printSheet])

  const send = useCallback(
    (request: LabelPrintRequest, reprintReason?: string) => {
      mutate(
        {
          caseId: request.caseId,
          sampleIds: request.sampleIds,
          reprintReason,
        },
        {
          onSuccess: (printed) => {
            setReasonFor(null)
            queuedRef.current = printed
            setLabels(printed)
          },
          onError: (error) => {
            if (hasErrorCode(error, ErrorCode.ReprintReasonRequired)) {
              setReasonFor(request)
              return
            }
            toast.error(sampleErrorText(error))
          },
        }
      )
    },
    [mutate]
  )

  const print = useCallback(
    (request: LabelPrintRequest) => {
      if (request.sampleIds.length === 0) {
        return
      }
      if (request.isReprint) {
        setReasonFor(request)
      } else {
        send(request)
      }
    },
    [send]
  )

  const value = useMemo(
    () => ({ print, isPrinting: mutation.isPending || labels !== null }),
    [print, mutation.isPending, labels]
  )

  const count = reasonFor?.sampleIds.length ?? 0

  return (
    <SampleLabelPrinterContext value={value}>
      {children}

      <ReasonDialog
        open={reasonFor !== null}
        onOpenChange={(open) => {
          if (!open) {
            setReasonFor(null)
          }
        }}
        title={count === 1 ? "Reprint label" : "Reprint labels"}
        description={
          count === 1
            ? "This label was printed before. Enter why it is being reprinted."
            : "Some of these labels were printed before. Enter why they are being reprinted."
        }
        label="Reprint reason"
        confirmLabel="Print"
        pending={mutation.isPending}
        onConfirm={(reason) => {
          if (reasonFor) {
            send(reasonFor, reason)
          }
        }}
      />

      {/* Only the inner node is copied into the print frame, so it prints while this stays hidden. */}
      <div className="hidden">
        <div ref={contentRef}>
          {labels?.map((label) => (
            <SampleLabelCard key={label.id} label={label} />
          ))}
        </div>
      </div>
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
