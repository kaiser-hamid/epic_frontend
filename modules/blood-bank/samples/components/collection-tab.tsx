"use client"

import { PrinterIcon, ScanBarcodeIcon, TestTubeIcon } from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"

import { DateTime } from "@/components/date-time"
import { Form } from "@/components/form"
import { QueryError } from "@/components/query-error"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ErrorCode, errorMessage, hasErrorCode } from "@/lib/api-error"
import { cn } from "@/lib/utils"
import { CaseStatusBadge } from "@/modules/blood-bank/cases/components/case-status-badge"
import {
  careTypeLabels,
  CaseDonorStatus,
  caseDonorStatusLabels,
  SampleStatus,
} from "@/modules/blood-bank/enums"
import { BloodBankPermission } from "@/modules/blood-bank/permissions"
import { useSampleLabelPrinter } from "@/modules/blood-bank/samples/components/sample-label-printer"
import { SampleStatusBadge } from "@/modules/blood-bank/samples/components/sample-status-badge"
import {
  SampleErrorCode,
  sampleErrorMessages,
  sampleErrorText,
} from "@/modules/blood-bank/samples/error-messages"
import {
  componentsSummary,
  subjectKey,
  subjectLabel,
  toCollectInput,
} from "@/modules/blood-bank/samples/format"
import {
  useCollectSamples,
  useFindSampleCollectionByInvoice,
  useSampleCollection,
} from "@/modules/blood-bank/samples/queries"
import type {
  CollectionSample,
  CollectionSubject,
  SampleCollection,
} from "@/modules/blood-bank/samples/types"
import { useCan } from "@/modules/shared/rbac/use-can"
import {
  bloodGroupLabels,
  genderLabels,
  patientTitleLabels,
} from "@/modules/shared/patient/enums"
import { formatPatientAge } from "@/modules/shared/patient/format"

/** A label can be printed for any drawn sample that was not rejected. */
function isLabelable(
  sample: CollectionSample | null
): sample is CollectionSample {
  return sample !== null && sample.status !== SampleStatus.Rejected
}

/**
 * Tab 1: scan an invoice, see the patient panel and one row per subject, tick rows and
 * collect, print labels. The loaded case lives in the URL (`?case=`), so the Pending tab and
 * a page reload can open it too.
 */
export function CollectionTab({
  caseId,
  onCaseChange,
}: {
  caseId: number | null
  onCaseChange: (caseId: number | null) => void
}) {
  const scanRef = useRef<HTMLInputElement>(null)
  const query = useSampleCollection(caseId)
  const view = caseId === null ? undefined : query.data

  function focusScan() {
    scanRef.current?.focus()
    scanRef.current?.select()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 xl:grid-cols-[20rem_1fr]">
        <WorkListBox scanRef={scanRef} onCaseChange={onCaseChange} />
        <PatientInfoPanel
          view={view}
          isLoading={caseId !== null && query.isPending}
        />
      </div>

      {caseId === null ? (
        <Card>
          <CardContent>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ScanBarcodeIcon />
                </EmptyMedia>
                <EmptyTitle>No case loaded</EmptyTitle>
                <EmptyDescription>
                  Scan or type an invoice no, or open a case from the Pending
                  tab.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : query.isError && !query.data ? (
        <QueryError error={query.error} onRetry={() => query.refetch()} />
      ) : view ? (
        <CollectionWorkspace
          key={view.case.id}
          view={view}
          onCollected={focusScan}
        />
      ) : (
        <Skeleton className="h-48 w-full" />
      )}
    </div>
  )
}

function WorkListBox({
  scanRef,
  onCaseChange,
}: {
  scanRef: React.RefObject<HTMLInputElement | null>
  onCaseChange: (caseId: number | null) => void
}) {
  const [invoiceNo, setInvoiceNo] = useState("")
  const [lookupError, setLookupError] = useState<string | null>(null)
  const lookup = useFindSampleCollectionByInvoice()

  function selectScan() {
    scanRef.current?.select()
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = invoiceNo.trim()
    if (value === "" || lookup.isPending) {
      return
    }

    lookup.mutate(value, {
      onSuccess: (view) => {
        setLookupError(null)
        onCaseChange(view.case.id)
        selectScan()
      },
      onError: (error) => {
        if (hasErrorCode(error, SampleErrorCode.CaseNotFound)) {
          onCaseChange(null)
          setLookupError(errorMessage(error, sampleErrorMessages))
        } else if (hasErrorCode(error, ErrorCode.ValidationFailed)) {
          setLookupError(sampleErrorText(error))
        } else {
          toast.error(errorMessage(error, sampleErrorMessages))
        }
        selectScan()
      },
    })
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Work list</CardTitle>
      </CardHeader>
      <CardContent>
        <Form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Field data-invalid={lookupError !== null}>
            <FieldLabel htmlFor="scan_invoice_no">Invoice no</FieldLabel>
            {/* Enter (typed, or a scanner's suffix) submits; there is no button. */}
            <InputGroup>
              <InputGroupAddon>
                <ScanBarcodeIcon />
              </InputGroupAddon>
              <InputGroupInput
                id="scan_invoice_no"
                ref={scanRef}
                value={invoiceNo}
                onChange={(event) => {
                  setInvoiceNo(event.target.value)
                  setLookupError(null)
                }}
                placeholder="Scan or type, then Enter"
                autoComplete="off"
                spellCheck={false}
                autoFocus
                maxLength={30}
                aria-invalid={lookupError !== null}
                aria-busy={lookup.isPending}
              />
              {lookup.isPending ? (
                <InputGroupAddon align="inline-end">
                  <Spinner />
                </InputGroupAddon>
              ) : null}
            </InputGroup>
            {lookupError ? <FieldError>{lookupError}</FieldError> : null}
          </Field>

          {/*
            The case no replaces the invoice no once the vendor billing system is retired
            (the backend lookup takes `case_no` then).
          <Field>
            <FieldLabel htmlFor="scan_case_no">Case no</FieldLabel>
            <Input id="scan_case_no" placeholder="Scan or type" autoComplete="off" />
          </Field>
          */}
        </Form>
      </CardContent>
    </Card>
  )
}

function PatientInfoPanel({
  view,
  isLoading,
}: {
  view: SampleCollection | undefined
  isLoading: boolean
}) {
  const patient = view?.patient ?? null
  const invoice = view?.invoice ?? null
  const record = view?.case ?? null

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Patient information
          {record ? <CaseStatusBadge status={record.status} /> : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3 2xl:grid-cols-4">
            <Info label="Patient no" value={patient?.patient_no} />
            <Info label="Invoice no" value={invoice?.invoice_no} />
            <Info
              label="Invoice date"
              value={
                invoice ? <DateTime value={invoice.billed_at} /> : undefined
              }
            />
            <Info
              label="Patient name"
              value={
                patient
                  ? [
                      patient.title ? patientTitleLabels[patient.title] : null,
                      patient.name,
                    ]
                      .filter(Boolean)
                      .join(" ")
                  : undefined
              }
            />
            <Info
              label="Age"
              value={patient ? formatPatientAge(patient) : undefined}
            />
            <Info
              label="Gender"
              value={patient?.gender ? genderLabels[patient.gender] : undefined}
            />
            <Info
              label="Blood group"
              value={
                patient?.blood_group
                  ? bloodGroupLabels[patient.blood_group]
                  : undefined
              }
            />
            <Info label="Phone mobile" value={patient?.phone} />
            <Info
              label="Ref. doc. name"
              value={
                invoice
                  ? invoice.is_self_referral
                    ? "Self"
                    : invoice.referred_by
                  : undefined
              }
            />
            <Info label="Case no" value={record?.case_no} />
            <Info
              label="Care of"
              value={record ? careTypeLabels[record.care_type] : undefined}
            />
            <Info
              label="Cause of transfusion"
              value={record?.transfusion_reason}
            />
            <Info label="Remarks" value={record?.reference_note} />
            <Info
              label="Components requested"
              value={record ? componentsSummary(record.components) : undefined}
              className="col-span-2"
            />
          </dl>
        )}
      </CardContent>
    </Card>
  )
}

function Info({
  label,
  value,
  className,
}: {
  label: string
  value: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{value ?? "—"}</dd>
    </div>
  )
}

function CollectionWorkspace({
  view,
  onCollected,
}: {
  view: SampleCollection
  onCollected: () => void
}) {
  const caseId = view.case.id
  const canCollect = useCan(BloodBankPermission.SampleCollect)
  const canPrint = useCan(BloodBankPermission.SampleLabelPrint)
  const { print, isPrinting } = useSampleLabelPrinter()
  const collect = useCollectSamples(caseId)
  const [ticked, setTicked] = useState<ReadonlySet<string>>(() => new Set())
  const [showLabel, setShowLabel] = useState(true)

  // Ticks on rows that stopped being collectable (after a refresh) no longer count.
  const collectableKeys = view.subjects
    .filter((subject) => subject.is_collectable)
    .map(subjectKey)
  const selectedCount = collectableKeys.filter((key) => ticked.has(key)).length
  const allState =
    collectableKeys.length > 0 && selectedCount === collectableKeys.length
      ? true
      : selectedCount > 0
        ? "indeterminate"
        : false
  const printableSamples = view.subjects
    .map((subject) => subject.sample)
    .filter(isLabelable)

  function setRowTicked(key: string, checked: boolean) {
    setTicked((current) => {
      const next = new Set(current)
      if (checked) {
        next.add(key)
      } else {
        next.delete(key)
      }
      return next
    })
  }

  function printSamples(samples: CollectionSample[]) {
    print({
      caseId,
      sampleIds: samples.map((sample) => sample.id),
      isReprint: samples.some((sample) => sample.label_print_count > 0),
    })
  }

  function handleCollect() {
    const subjects = view.subjects
      .filter(
        (subject) => subject.is_collectable && ticked.has(subjectKey(subject))
      )
      .map(toCollectInput)
      .filter((input) => input !== null)
    if (subjects.length === 0 || collect.isPending) {
      return
    }

    collect.mutate(subjects, {
      onSuccess: (next) => {
        setTicked(new Set())
        const count = next.collected_sample_ids.length
        toast.success(
          count === 1 ? "1 sample collected." : `${count} samples collected.`
        )
        if (showLabel && canPrint && count > 0) {
          print({
            caseId,
            sampleIds: next.collected_sample_ids,
            isReprint: false,
          })
        }
        onCollected()
      },
      onError: (error) => toast.error(sampleErrorText(error)),
    })
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_14rem]">
      <Card size="sm" className="min-w-0">
        <CardContent>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Blood group</TableHead>
                  <TableHead>Donor status</TableHead>
                  <TableHead>Sample no</TableHead>
                  <TableHead>Sample status</TableHead>
                  <TableHead>Collected at</TableHead>
                  {canCollect ? (
                    <TableHead>
                      <label className="flex items-center gap-2">
                        <Checkbox
                          checked={allState}
                          disabled={collectableKeys.length === 0}
                          onCheckedChange={(checked) =>
                            setTicked(
                              checked === true
                                ? new Set(collectableKeys)
                                : new Set()
                            )
                          }
                          aria-label="Select all collectable rows"
                        />
                        Coll.
                      </label>
                    </TableHead>
                  ) : null}
                  {canPrint ? (
                    <TableHead>
                      <span className="sr-only">Label</span>
                    </TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {view.subjects.map((subject) => (
                  <SubjectRow
                    key={subjectKey(subject)}
                    subject={subject}
                    canCollect={canCollect}
                    canPrint={canPrint}
                    ticked={ticked.has(subjectKey(subject))}
                    onTickedChange={(checked) =>
                      setRowTicked(subjectKey(subject), checked)
                    }
                    printDisabled={isPrinting}
                    onPrint={(sample) => printSamples([sample])}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card size="sm" className="self-start">
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {canCollect ? (
            <Button
              onClick={handleCollect}
              disabled={selectedCount === 0 || collect.isPending}
            >
              {collect.isPending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <TestTubeIcon data-icon="inline-start" />
              )}
              {selectedCount > 0 ? `Collect (${selectedCount})` : "Collect"}
            </Button>
          ) : null}
          {canPrint ? (
            <Button
              variant="outline"
              onClick={() => printSamples(printableSamples)}
              disabled={printableSamples.length === 0 || isPrinting}
            >
              <PrinterIcon data-icon="inline-start" />
              Label (All)
            </Button>
          ) : null}
          {canCollect && canPrint ? (
            <Field orientation="horizontal">
              <Checkbox
                id="show_label"
                checked={showLabel}
                onCheckedChange={(checked) => setShowLabel(checked === true)}
              />
              <FieldLabel htmlFor="show_label" className="font-normal">
                Show Label
              </FieldLabel>
            </Field>
          ) : null}
          {!canCollect && !canPrint ? (
            <p className="text-sm text-muted-foreground">
              You can view this case but cannot collect samples or print labels
              in this branch.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

function SubjectRow({
  subject,
  canCollect,
  canPrint,
  ticked,
  onTickedChange,
  printDisabled,
  onPrint,
}: {
  subject: CollectionSubject
  canCollect: boolean
  canPrint: boolean
  ticked: boolean
  onTickedChange: (checked: boolean) => void
  printDisabled: boolean
  onPrint: (sample: CollectionSample) => void
}) {
  const label = subjectLabel(subject)
  const deferred = subject.case_donor_status === CaseDonorStatus.Deferred
  const { sample } = subject

  return (
    <TableRow
      data-state={ticked && subject.is_collectable ? "selected" : undefined}
      className={cn(deferred && "text-muted-foreground opacity-60")}
    >
      <TableCell>
        <span className="flex items-center gap-2">
          {label}
          {deferred ? <Badge variant="destructive">Deferred</Badge> : null}
        </span>
      </TableCell>
      <TableCell className="font-medium">{subject.number ?? "—"}</TableCell>
      <TableCell>{subject.name ?? "—"}</TableCell>
      <TableCell className="tabular-nums">{subject.age ?? "—"}</TableCell>
      <TableCell>
        {subject.gender ? genderLabels[subject.gender] : "—"}
      </TableCell>
      <TableCell>
        {subject.blood_group ? bloodGroupLabels[subject.blood_group] : "—"}
      </TableCell>
      <TableCell>
        {subject.case_donor_status
          ? caseDonorStatusLabels[subject.case_donor_status]
          : "—"}
      </TableCell>
      <TableCell className="font-medium">{sample?.sample_no ?? "—"}</TableCell>
      <TableCell>
        {sample ? <SampleStatusBadge status={sample.status} /> : "—"}
      </TableCell>
      <TableCell>
        <DateTime value={sample?.collected_at} />
      </TableCell>
      {canCollect ? (
        <TableCell>
          <Checkbox
            checked={ticked && subject.is_collectable}
            disabled={!subject.is_collectable}
            onCheckedChange={(checked) => onTickedChange(checked === true)}
            aria-label={`Collect sample from ${label}`}
          />
        </TableCell>
      ) : null}
      {canPrint ? (
        <TableCell>
          <Button
            variant="outline"
            size="xs"
            disabled={!isLabelable(sample) || printDisabled}
            onClick={() => {
              if (isLabelable(sample)) {
                onPrint(sample)
              }
            }}
            aria-label={`Print label for ${label}`}
          >
            <PrinterIcon data-icon="inline-start" />
            Label
          </Button>
        </TableCell>
      ) : null}
    </TableRow>
  )
}
