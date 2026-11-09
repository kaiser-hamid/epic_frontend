"use client"

import { useCallback, useState } from "react"
import { toast } from "sonner"

import { ReasonDialog } from "@/components/reason-dialog"
import { ErrorCode, hasErrorCode } from "@/lib/api-error"
import { printServiceErrorText } from "@/lib/print-service"

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

/** A logged label the backend rendered as raw printer commands. */
export type RawLabel = { label_command: string }

type RawLabelPrintFlowOptions<
  TJob extends LabelPrintJob,
  TLabel extends RawLabel,
> = Omit<LoggedLabelPrintOptions<TJob, TLabel>, "onLogged"> & {
  /** Sends the labels' commands (concatenated) to its printer, e.g. `printBagLabels`. */
  printCommands: (ezpl: string, opts: { jobName: string }) => Promise<unknown>
  /** The print job name, e.g. "Bag labels BT2611020003". */
  jobName: (labels: TLabel[]) => string
}

/**
 * The label print flow for labels the backend renders as printer commands (`label_command`):
 * `useLoggedLabelPrint`, then the commands go to the workstation print service unchanged, as one
 * job in the order returned. The print is already logged by then, so a failed print is only
 * reported; the user reprints (with a reason) from the Label button. `sendToPrinter` prints
 * labels another call already logged. Render `element` once (it holds the reason dialog).
 */
export function useRawLabelPrintFlow<
  TJob extends LabelPrintJob,
  TLabel extends RawLabel,
>({
  printCommands,
  jobName,
  ...logOptions
}: RawLabelPrintFlowOptions<TJob, TLabel>) {
  const [isSending, setIsSending] = useState(false)

  const sendToPrinter = useCallback(
    async (labels: TLabel[]) => {
      if (labels.length === 0) {
        return
      }
      setIsSending(true)
      try {
        await printCommands(
          labels.map((label) => label.label_command).join(""),
          { jobName: jobName(labels) }
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
    },
    [printCommands, jobName]
  )

  const { print, element } = useLoggedLabelPrint({
    ...logOptions,
    onLogged: sendToPrinter,
  })

  return {
    print,
    sendToPrinter,
    isPrinting: logOptions.isPending || isSending,
    element,
  }
}
