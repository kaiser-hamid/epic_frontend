"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useReactToPrint } from "react-to-print"
import { toast } from "sonner"

import { ReasonDialog } from "@/components/reason-dialog"
import { ErrorCode, hasErrorCode } from "@/lib/api-error"

/** A batch of labels to print. */
export type LabelPrintJob = {
  /**
   * True when a label was printed before (or a reason is always wanted): the reason is asked
   * for before calling the API. When unknown, pass false; a `REPRINT_REASON_REQUIRED` answer
   * opens the same dialog and retries.
   */
  isReprint: boolean
}

type SendCallbacks<TLabel> = {
  onSuccess: (labels: TLabel[]) => void
  onError: (error: unknown) => void
}

type LoggedLabelPrintOptions<TJob extends LabelPrintJob, TLabel> = {
  /** Logs the print (the module's print-log mutation) and hands back the label contents. */
  send: (
    job: TJob,
    reprintReason: string | undefined,
    callbacks: SendCallbacks<TLabel>
  ) => void
  /** Whether the print-log request is in flight. */
  isPending: boolean
  /** How many labels a job prints (0 skips it). */
  labelCount: (job: TJob) => number
  errorText: (error: unknown) => string
  /** Prints the labels the log returned. Runs only after the log succeeded. */
  onLogged: (labels: TLabel[]) => void
}

/**
 * The first half of every label print: log the print, asking for a reprint reason when needed
 * (up front, or on `REPRINT_REASON_REQUIRED`) and retrying, then hand the returned labels to
 * `onLogged`. Render `element` once (it holds the reason dialog).
 */
export function useLoggedLabelPrint<TJob extends LabelPrintJob, TLabel>({
  send,
  isPending,
  labelCount,
  errorText,
  onLogged,
}: LoggedLabelPrintOptions<TJob, TLabel>) {
  const [reasonFor, setReasonFor] = useState<TJob | null>(null)

  const logAndPrint = useCallback(
    (job: TJob, reprintReason?: string) => {
      if (isPending) {
        return
      }
      send(job, reprintReason, {
        onSuccess: (printed) => {
          setReasonFor(null)
          onLogged(printed)
        },
        onError: (error) => {
          if (hasErrorCode(error, ErrorCode.ReprintReasonRequired)) {
            setReasonFor(job)
            return
          }
          toast.error(errorText(error))
        },
      })
    },
    [send, isPending, errorText, onLogged]
  )

  const print = useCallback(
    (job: TJob) => {
      if (labelCount(job) === 0) {
        return
      }
      if (job.isReprint) {
        setReasonFor(job)
      } else {
        logAndPrint(job)
      }
    },
    [logAndPrint, labelCount]
  )

  const count = reasonFor === null ? 0 : labelCount(reasonFor)

  const element = (
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
      pending={isPending}
      onConfirm={(reason) => {
        if (reasonFor) {
          logAndPrint(reasonFor, reason)
        }
      }}
    />
  )

  return { print, element }
}

type LabelPrintFlowOptions<TJob extends LabelPrintJob, TLabel> = Omit<
  LoggedLabelPrintOptions<TJob, TLabel>,
  "onLogged"
> & {
  documentTitle: string
  /** react-to-print `pageStyle`: the label stock's `@page` size. */
  pageStyle: string
  renderLabels: (labels: TLabel[]) => React.ReactNode
}

/**
 * The label print flow for labels laid out in HTML: `useLoggedLabelPrint`, then the returned
 * label contents are printed with react-to-print. Render `element` once (it holds the reason
 * dialog and the hidden print sheet).
 */
export function useLabelPrintFlow<TJob extends LabelPrintJob, TLabel>({
  documentTitle,
  pageStyle,
  renderLabels,
  ...logOptions
}: LabelPrintFlowOptions<TJob, TLabel>) {
  const [labels, setLabels] = useState<TLabel[] | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const printSheet = useReactToPrint({
    contentRef,
    documentTitle,
    pageStyle,
    onAfterPrint: () => setLabels(null),
    onPrintError: () => {
      setLabels(null)
      toast.error("The labels could not be sent to the printer.")
    },
  })

  // The sheet (and its barcodes) has rendered by the time this runs. `printSheet` changes
  // identity on re-render, so the batch it was queued for is tracked to print it once.
  const queuedRef = useRef<TLabel[] | null>(null)
  useEffect(() => {
    if (labels && queuedRef.current === labels) {
      queuedRef.current = null
      printSheet()
    }
  }, [labels, printSheet])

  const onLogged = useCallback((printed: TLabel[]) => {
    queuedRef.current = printed
    setLabels(printed)
  }, [])

  const { print, element: reasonDialog } = useLoggedLabelPrint({
    ...logOptions,
    onLogged,
  })

  const element = (
    <>
      {reasonDialog}

      {/* Only the inner node is copied into the print frame, so it prints while this stays hidden. */}
      <div className="hidden">
        <div ref={contentRef}>{labels ? renderLabels(labels) : null}</div>
      </div>
    </>
  )

  return {
    print,
    isPrinting: logOptions.isPending || labels !== null,
    element,
  }
}
